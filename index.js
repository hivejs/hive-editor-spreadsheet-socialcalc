var path = require('path')
  , spreadsheetOT = require('./lib/ot-spreadsheet')

module.exports = setup
module.exports.consumes = ['ui', 'ot', 'importexport', 'sync', 'orm']

function setup(plugin, imports, register) {
  var ui = imports.ui
  var ot = imports.ot
  var importexport = imports.importexport
  var sync = imports.sync
  var orm = imports.orm

  ui.registerModule(path.join(__dirname, 'client.js'))
  ui.registerStaticDir(path.join(__dirname, 'lib'))
  ui.registerStylesheet(path.join('__dirname', '..', 'socialcalc', 'socialcalc.css'))

  ot.registerOTType('spreadsheet', spreadsheetOT)

/*  importexport.registerExportProvider('spreadsheet', 'application/vnd.oasis.opendocument.spreadsheet'
  , function*(document, snapshot) {
    return vdomToHtml(JSON.parse(snapshot.contents))
  })

  importexport.registerImportProvider('spreadsheet', 'application/vnd.oasis.opendocument.spreadsheet'
  , function*(document, user, data) {
    var sanitizedSvg = sanitizeHtml(data, {
      allowedTags: svgTags
    , allowedAttributes: {
        '*': svgAttributes
      }
    })
    var importedTree = domOT.create(sanitizedSvg)

    // get gulf doc and prepare changes
    var gulfDoc = yield sync.getDocument(document.id)
    if(!gulfDoc.initialized) {
      yield function(cb) {
        gulfDoc.once('init', cb)
      }
    }

    var root = gulfDoc.content
      , insertPath = [root.childNodes.length]
      , changes = [new domOT.Move(null, insertPath, domOT.serialize(importedTree))]

    var snapshot = yield orm.collections.snapshot
    .findOne({id: document.latestSnapshot})

    // commit changes
    yield function(cb) {
      gulfDoc.receiveEdit(JSON.stringify({
        cs: JSON.stringify(changes)
      , parent: snapshot.id
      , user: user
      }), null, cb)
    }
  })
*/
  register()
}

var defaultInitialData = '<svg id="svgcontent" width="580" height="400" x="150.5" y="11.5" overflow="hidden" xmlns="http://www.w3.org/2000/svg" xmlns:se="http://svg-edit.googlecode.com" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 580 400"><g style="pointer-events:none"><title style="pointer-events:inherit">Drawing</title><rect x="-1" y="-1" width="582" height="402" id="canvas_background" fill="#fff" style="pointer-events:inherit"/><g id="canvasGrid" width="100%" height="100%" x="0" y="0" overflow="visible" display="none"><rect width="100%" height="100%" x="0" y="0" stroke-width="0" stroke="none" fill="url(#gridpattern)" style="pointer-events: none; display:visible;"/></g></g><defs></defs><g style="pointer-events:all"><title style="pointer-events:inherit">Layer 1</title></g></svg>'
