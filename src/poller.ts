import { Sequelize } from 'sequelize'
import PQueue from 'p-queue'
import PouchDB from 'pouchdb'
import { NpmVersion, NpmTag, INpmTag, literal, INpmVersion } from './models.js'

const db = new PouchDB('https://replicate.npmjs.com/')

async function pollPackage(_workQueue: PQueue, pkgName: string): Promise<void> {
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

	const res: any = await db.get(pkgName)

	const existingDocs = await pExistingDocs
	// Note: this assumes a version will never change (which is valid), or be removed (as it is unlikely, but possible)

	// TODO - handle queries failing

	await Promise.all(
		Object.keys(res.time).map(async (versionStr: string) => {
			const exists = existingDocs.find((doc): boolean => doc.version === versionStr)
			if (!exists) {
				if (versionStr === 'created' || versionStr === 'modified') return
				const timeStr = res.time[versionStr]

				await NpmVersion.create(
					literal<INpmVersion>({
						package: pkgName,
						version: versionStr,
						published: new Date(timeStr),
					})
				)
			}
		})
	)

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
				await NpmTag.create(
					literal<INpmTag>({
						package: pkgName,
						version: tagVersion,
						tag: tag,
					})
				)
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
		packagesList.map(
			(pkgName) => (): Promise<void> =>
				pollPackage(workQueue, pkgName).catch((e) => {
					console.error(`Failed to scrape package: "${pkgName}"`)
					console.error(e)
				})
		)
	)

	await workQueue.onIdle()
	console.log('Completed poll')
}
