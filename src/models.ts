import { Sequelize, Model, DataTypes } from 'sequelize'

const mysqlUrl = process.env.MYSQL_URL || ''

if (!mysqlUrl || mysqlUrl.length === 0) {
	throw new Error('MYSQL_URL is required')
}

const sequelize = new Sequelize(mysqlUrl)

export class NpmVersion extends Model {
	public package!: string
	public version!: string
}
export class NpmTag extends Model {
	public package!: string
	public version!: string
	public tag!: string
}

NpmVersion.init(
	{
		package: DataTypes.STRING,
		version: DataTypes.STRING,
	},
	{
		sequelize,
		modelName: 'npm_version',
		createdAt: false,
		updatedAt: false,
		deletedAt: false,
		indexes: [
			{
				fields: ['package'],
			},
			{
				fields: ['version'],
			},
		],
	}
)
NpmTag.init(
	{
		package: DataTypes.STRING,
		version: DataTypes.STRING,
		tag: DataTypes.STRING,
	},
	{
		sequelize,
		modelName: 'npm_tag',
		createdAt: false,
		updatedAt: false,
		deletedAt: false,
		indexes: [
			{
				fields: ['package'],
			},
			{
				fields: ['version'],
			},
		],
	}
)

export function initDb(): Promise<Sequelize> {
	return sequelize.sync().then(() => sequelize)
}
