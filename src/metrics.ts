import { Gauge } from 'prom-client'

const packageVersions: Gauge<'package' | 'version' | 'release'> = new Gauge({
  name: 'npm_package_version',
  help: 'NPM package version',
  labelNames: ['package', 'version', 'release'],
})

export { packageVersions }
