/**
 * hive.js
 * Copyright (C) 2013-2016 Marcel Klehr <mklehr@gmx.net>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the Mozilla Public License version 2
 * as published by the Mozilla Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the Mozilla Public License
 * along with this program.  If not, see <https://www.mozilla.org/en-US/MPL/2.0/>.
 */
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
    window.addEventListener('click', checkFocus)

    onClose(_ => {
      window.removeEventListener('resize', resizeEditor)
      window.removeEventListener('click', checkFocus)
    })

    var socialCalcControl, doc

    // load the editor
    return ui.requireScript(ui.baseURL+'/static/build/socialcalc.js')
    .then(() => {
      var bindEditor = require('gulf-socialcalc')
        , SocialCalc = require('socialcalc')
      window.SocialCalc = SocialCalc // Necessary for certain event handlers to work
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

    function checkFocus(e) {
      if (!el.contains(e.target)) {
        blurEditor()
      }
      else if (e.target !== document.activeElement) {
        document.activeElement.blur()
      }
    }
    function blurEditor() {
      SocialCalc.Keyboard.passThru = true
    }

    function resizeEditor() {
      el.firstChild.style['display'] = 'none'
      var constraints = el.getBoundingClientRect()
      el.firstChild.style['display'] = 'block'
      socialCalcControl.editor.ResizeTableEditor(constraints.width, constraints.height-150)
      socialCalcControl.sheet.ScheduleSheetCommands('recalc', /*saveundo:*/false, /*isRemote:*/false)
    }

  })
  register()
}
