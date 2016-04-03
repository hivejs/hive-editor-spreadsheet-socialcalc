var bindEditor = require('./lib/socialCalcBinding')
  , SocialCalc = require('socialcalc')

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

    onClose(_ => {
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

      // bind editor
      doc = bindEditor(socialCalcControl)
      return Promise.resolve(doc)
    })

  })
  register()
}
