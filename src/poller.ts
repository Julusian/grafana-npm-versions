import { Sequelize } from 'sequelize'
import * as axios from 'axios'
import PQueue from 'p-queue'
import { NpmVersion, NpmTag } from './models'

async function pollPackageVersion(pkgName: string, version: string): Promise<void> {
	// TODO - load and save the more fields

	await NpmVersion.create({
		package: pkgName,
		version: version,
	})
}

async function pollPackage(workQueue: PQueue, pkgName: string): Promise<void> {
	const pExistingDocs: Promise<NpmVersion[]> = NpmVersion.findAll({
		where: {
			package: pkgName,
		},
	})
	const pExistingTags: Promise<NpmTag[]> = NpmTag.findAll({
		where: {
			package: pkgName,
		},
	})

	const rawRes = await axios.default.get(`https://registry.npmjs.org/${pkgName}`, {
		headers: {
			Accept: 'application/vnd.npm.install-v1+json',
		},
	})
	const res = rawRes.data

	const existingDocs = await pExistingDocs
	// Note: this assumes a version will never change (which is valid), or be removed (as it is unlikely, but possible)

	Object.keys(res.versions).forEach((versionStr: string) => {
		const exists = existingDocs.find((doc): boolean => doc.version === versionStr)
		if (!exists) {
			workQueue.add(() =>
				pollPackageVersion(pkgName, versionStr).catch((e) => {
					console.error(`Failed to scrape package version: "${pkgName}#${versionStr}" ${JSON.stringify(e)}`)
				})
			)
		}
	})

	// update dist-tage
	const existingTags = await pExistingTags
	// TODO - can tags be deleted?
	await Promise.all(
		Object.keys(res['dist-tags']).map(async (tag: string) => {
			const tagVersion: string = res['dist-tags'][tag]
			const exists = existingTags.find((doc): boolean => doc.tag === tag)
			if (exists && exists.version !== tagVersion) {
				await NpmTag.update(
					{
						version: tagVersion,
					},
					{
						where: {
							package: pkgName,
							tag: tag,
						},
					}
				)
			} else if (!exists) {
				await NpmTag.create({
					package: pkgName,
					version: tagVersion,
					tag: tag,
				})
			}
		})
	)
}

export async function doPoll(_sequelize: Sequelize, packagesList: string[]): Promise<void> {
	console.log('Starting poll')

	const workQueue = new PQueue({
		concurrency: 10,
		// TODO - timeout error handling
		timeout: 4000,
	})

	workQueue.addAll(
		packagesList.map((pkgName): (() => Promise<void>) => (): Promise<void> =>
			pollPackage(workQueue, pkgName).catch((e) => {
				console.error(`Failed to scrape package: "${pkgName}" ${JSON.stringify(e)}`)
			})
		)
	)

	await workQueue.onEmpty()
	console.log('Completed poll')
}
