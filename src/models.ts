import { Sequelize, Model, DataTypes, DataType, ModelAttributeColumnOptions } from 'sequelize'

const mysqlUrl = process.env.MYSQL_URL || ''

if (!mysqlUrl || mysqlUrl.length === 0) {
	throw new Error('MYSQL_URL is required')
}

const sequelize = new Sequelize(mysqlUrl)

export function literal<T>(v: T): T {
	return v
}

export interface INpmVersion {
	package: string
	version: string
	published: Date
}
export interface INpmTag {
	package: string
	version: string
	tag: string
}

export class NpmVersion extends Model implements INpmVersion {
	public package!: string
	public version!: string
	public published!: Date
}
export class NpmTag extends Model implements INpmTag {
	public package!: string
	public version!: string
	public tag!: string
}

NpmVersion.init(
	literal<{ [field in keyof INpmVersion]: DataType | ModelAttributeColumnOptions }>({
		package: DataTypes.STRING,
		version: DataTypes.STRING,
		published: DataTypes.DATE,
	}),
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
	literal<{ [field in keyof INpmTag]: DataType | ModelAttributeColumnOptions }>({
		package: DataTypes.STRING,
		version: DataTypes.STRING,
		tag: DataTypes.STRING,
	}),
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
