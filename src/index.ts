import { createTerminus, HealthCheckError, TerminusOptions } from '@godaddy/terminus'
import { createServer } from 'http'
import * as express from 'express'
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import * as reissue from 'reissue'
import * as Prometheus from 'prom-client'
import * as Metrics from './metrics'
import * as PTimeout from 'p-timeout'
import * as axios from 'axios'

let initialScrapingFinished = false
async function healthCheck(): Promise<any> {
  if (!initialScrapingFinished) {
    throw new HealthCheckError('healthcheck failed', ['Initial scraping not finished'])
  }
  return {}
}

async function onSignal(): Promise<any> {
  console.log('caught signal. Starting cleanup')
}

async function onShutdown(): Promise<any> {
  console.log('cleanup finished, server is shutting down')
}

const terminusOptions: TerminusOptions = {
  healthChecks: {
    '/healthcheck': healthCheck,
  },
  signals: ['SIGINT', 'SIGTERM'],
  onSignal,
  onShutdown,
  logger: console.log,
}

const port = Number(process.env.PORT) || 9600
const pollInterval = Number(process.env.POLL_INTERVAL) || 30000
const packagesList = (process.env.PACKAGES || '').split(',').filter((n): boolean => !!n)

if (packagesList.length === 0) {
  throw new Error('Some packages must be specified')
}

const app = express()
const server = createServer(app)

createTerminus(server, terminusOptions)

interface PackageInfo {
  id: string
  versions: Array<{
    name: string
    // date: string
    tag?: string
  }>
}

let currentData: PackageInfo[] = []

async function doPoll(): Promise<void> {
  console.log('Starting poll')

  const newData = await Promise.all(
    packagesList.map((pkgName) => {
      return PTimeout<PackageInfo>(
        (async (): Promise<PackageInfo> => {
          const rawRes = await axios.default.get(`https://registry.npmjs.org/${pkgName}`, {
            headers: {
              Accept: 'application/vnd.npm.install-v1+json',
            },
          })
          const res = rawRes.data

          const distTags = res['dist-tags']
          return {
            id: pkgName,
            versions: Object.keys(res.versions).map((v) => {
              const tag = Object.keys(distTags).find((t) => distTags[t] === v)

              return {
                name: v,
                // date: res.time[v],
                tag: tag,
              }
            }),
          }
        })(),
        5000
      ).catch((e) => {
        console.error(`Failed to scrape: "${pkgName}": ${JSON.stringify(e)}`)
        return undefined
      })
    })
  )
  currentData = newData.filter((v): boolean => !!v) as PackageInfo[]

  initialScrapingFinished = true
  console.log('Completed poll')
}

const poller = reissue.create({
  func: async (callback: () => void) => {
    try {
      await doPoll()
    } catch (e) {
      console.error(`Poll threw error: ${JSON.stringify(e)}`)
    }
    return callback()
  },
  interval: pollInterval,
})

poller.start()

app.get('/metrics', (_req, res) => {
  console.log('Got scrape')

  Metrics.packageVersions.reset()

  currentData.forEach((pkg) => {
    pkg.versions.forEach((ver) => {
      if (ver.name === 'created' || ver.name === 'modified') return
      Metrics.packageVersions.set({ package: pkg.id, version: ver.name, release: '' /*ver.date*/ }, 1)
    })
  })

  res.set('Content-Type', Prometheus.register.contentType)
  res.end(Prometheus.register.metrics())
})

server.listen(port, () => console.log(`Listening at http://localhost:${port}`))
