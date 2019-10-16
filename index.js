const debug = require('debug')('zipserver')
const JSZip = require('jszip')
const mime = require('mime/lite')

const startHttp = Buffer.from(`HTTP/1.1 `)
const startHttp2 = Buffer.from(`HTTP/2 `)
const raw404 = `HTTP/1.1 404 Not Found\r\n\r\n`
const LF = '\r\n'

const isHttpResponse = function(buf) {
  debug(`buffer starts with '${buf.slice(0,startHttp2.length).toString()}'`)
  return buf.slice(0,startHttp.length).equals(startHttp) || buf.slice(0, startHttp2.length).equals(startHttp2)
}

const makeResponse = (buf, headers={}) => {
  headers['Content-Length'] = buf.length
  const lines = [`${startHttp}200 OK`]
  for (let k in headers) {
    lines.push(`${k}: ${headers[k]}`)
  }
  lines.push(LF)
  return Buffer.concat([Buffer.from(lines.join(LF)), buf])
}

class ZipServer {
  constructor(zipBuffer) {
    if (!zipBuffer) throw new Error('Must provide a zip buffer')
    this.waitUntilReady = new Promise((resolve, reject) => {
      JSZip.loadAsync(zipBuffer).then(zip => {
        debug("zip loaded, ready")
        this.zip = zip
        resolve()
      }).catch(err => reject(err))
    })
  }

  async get(pathname) {
    let realPath = pathname.slice(1)
    if (realPath === '') realPath = 'index.html'
    debug(`getting ${pathname}`)
    debug(`real path is ${realPath}`)
    await this.waitUntilReady 
    debug("done waiting, looking for file")
    let fileEntry = this.zip.file(realPath)
    if (!fileEntry) {
      debug(`didn't find ${pathname}, returning 404`)
      return raw404
    } else {
      const buf = await fileEntry.async("nodebuffer")
      if (isHttpResponse(buf)) { 
        debug("the stored file is a valid response, sending it")
        return buf
      } else {
        debug("stored file isn't a valid response, building response")
        const type = mime.getType(realPath)
        return makeResponse(buf, {
          'Content-Type': type
        })
      }
    }
  }
}

module.exports = ZipServer
