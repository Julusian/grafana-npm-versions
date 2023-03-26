# Grafana NPM Versions bridge

This projects monitors npm packages for new versions, storing into a mysql database for consumption in grafana.

## Example query

```sql
SELECT
  npm_versions.package as Package,
  npm_versions.version as Version,
  npm_tags.tag as Tag,
  npm_versions.published as Published
FROM npm_versions
LEFT JOIN npm_tags ON npm_tags.package = npm_versions.package AND npm_tags.version = npm_versions.version
WHERE (published >= $__timeFrom() AND published <= $__timeTo())
  OR npm_tags.tag IN ('latest', 'nightly') -- , 'experimental')

ORDER BY npm_versions.published DESC
LIMIT 50
```

## Installation

Ensure you have a running mysql server

Define the following environment variables, updating for your setup as appropriate:

1. `MYSQL_URL` eg `mysql://USERNAME:PASSWORD@HOST/DATABASE`
1. `PACKAGES` A comma separated list of packages to monitor eg `atem-connection,@julusian/jpeg-turbo`

It can be run in docker like:

```bash
docker run --restart=always \
  -e MYSQL_URL="mysql://USERNAME:PASSWORD@HOST/DATABASE" \
  -e PACKAGES=atem-connection,@julusian/jpeg-turbo \
   ghcr.io/julusian/grafana-npm-versions

```

Or in node:

1. `yarn install`
1. `yarn build`
1. `node dist/index.js`

## Development

1. `yarn install`
1. `yarn dev`
