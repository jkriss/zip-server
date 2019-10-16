const ZipServer = require('../index')
const fs = require('fs')
const path = require('path')
const http = require('http')
const url = require('url')

const PORT = 4000
const zipFilePath = process.argv.slice(2)[0] || path.join(__dirname, 'simple.zip')

const zipFile = fs.readFileSync(zipFilePath)
const zipServer = new ZipServer(zipFile)

const server = http.createServer((req, res) => {
  console.log("req:", req.url)
  const { pathname } = url.parse(req.url)
  // zip server returns a full html response, send it straight to the socket
  zipServer.get(pathname).then(zipResponse => req.connection.end(zipResponse))
})

server.listen(PORT, () => console.log(`Listening at http://localhost:${PORT}`))
