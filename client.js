var bindEditor = require('./lib/socialCalcBinding')
  , SocialCalc = require('socialcalc')
require('./lib/SocialCalc_broadcast')
window.SocialCalc = SocialCalc // Necessary for certain event handlers to work

module.exports = setup
module.exports.consumes = ['ui', 'editor']
module.exports.provides = []
function setup(plugin, imports, register) {
  var editor = imports.editor
    , ui = imports.ui

  var script = document.createElement('script')
  script.src = ui.baseURL+'/static/hive-editor-spreadsheet-socialcalc/lib/jquery.min.js'
  if(!window.$) document.head.appendChild(script)

  editor.registerEditor('SocialCalc', 'spreadsheet', 'A spreadsheet editor'
  , function(el, onClose) {

    window.addEventListener('resize', resizeEditor)

    onClose(_ => {
      window.removeEventListener('resize', resizeEditor)
    })

    var socialCalcControl, doc

    /*var script = document.createElement('script')
    script.id = 'SocialCalc'
    script.src = ui.baseURL+'/static/hive-editor-spreadsheet-socialcalc/lib/SocialCalc.js'
*/
    // load the editor
    return new Promise(function(resolve) {
      return resolve()
      if (document.querySelector('#SocialCalc'))  {
        return resolve()
      }
      script.onload = function() {
        resolve()
      }
      document.head.appendChild(script)
    })
    .then(() => {
      SocialCalc.ConstantsSetImagePrefix(ui.baseURL+'/static/socialcalc/images/sc_')
      socialCalcControl = new SocialCalc.SpreadsheetControl()
      socialCalcControl.InitializeSpreadsheetControl(el /*, height, width, spacebelow*/)
      el.style['height'] = '100%'
      el.firstChild.style['display'] = 'none' // Hide until init
      el.firstChild.style['width'] = '100%'
      el.firstChild.style['height'] = '100%'

      // bind editor
      doc = bindEditor(socialCalcControl)

      doc.once('editableInitialized', () => setImmediate(resizeEditor)) // defer, because plugins may affect space

      return Promise.resolve(doc)
    })

    function resizeEditor() {
      el.firstChild.style['display'] = 'none'
      var constraints = el.getBoundingClientRect()
      socialCalcControl.editor.ResizeTableEditor(constraints.width, constraints.height)
      el.firstChild.style['display'] = 'block'
    }

  })
  register()
}
