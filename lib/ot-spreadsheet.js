var SocialCalc = require('socialcalc')

const operationsHash = {Set: Set}
const operationsList = [Set]
const scInstance = new SocialCalc.SpreadsheetControl()

exports.create = function() {
  SocialCalc.ResetSheet(scInstance.sheet)
  var newScSnapshot = SocialCalc.CreateSheetSave(scInstance.sheet)
  return newScSnapshot
}

exports.apply = function(scSnapshot, ops) {
  // load snapshot into our global SocialCalc instance
  scInstance.sheet.ParseSheetSave(scSnapshot)

  // Turn ops into a command string
  var cmds = unpackOps(ops)
  .map((op) => op.serialize())
  .filter((op) => !!op)
  .forEach((cmd) => {
    var error = SocialCalc.ExecuteSheetCommand(scInstance.sheet, new SocialCalc.Parse(cmd), /*saveundo:*/false)
    if(error) throw new Error(error)
  })

  var newScSnapshot = SocialCalc.CreateSheetSave(scInstance.sheet)

  return newScSnapshot
}

exports.transform = function(ops1, ops2, side) {
  return unpackOps(ops1).map(function(op1) {
    unpackOps(ops2).forEach(function(op2) {
      op1.transformAgainst(op2, ('left'==side))
    })
    return op1
  })
}

exports.compose = function(ops1, ops2) {
  return ops1.concat(ops2)
}

exports.deserializeEdit = function(cmds) {
  return cmds.split('\n')
  .reduce((ops, cmd) => {
    var op 
    operationsList.some((Operation) => op = Operation.parse(cmd))
    if(op) op.forEach(op => ops.push(op)) // If nothing recognizes this, we filter it out.
    return ops
  }, [])
}

exports.serializeEdit = function(ops) {
  return unpackOps(ops).map((op) => op.serialize()).join('\n')
}

function unpackOps (ops) {
  return ops
  .map((op) => operationsHash[op.type].hydrate(op))
}


/**
----------------------------
OPERATIONS
----------------------------
*/
// These are SocialCalcs commands in the original format (we parse and serialize operations from7to this format):
//
//    set sheet attributename value (plus lastcol and lastrow)
//    set 22 attributename value
//    set B attributename value
//    set A1 attributename value1 value2... (see each attribute in code for details)
//    set A1:B5 attributename value1 value2...
//    erase/copy/cut/paste/fillright/filldown A1:B5 all/formulas/format
//    loadclipboard save-encoded-clipboard-data
//    clearclipboard
//    merge C3:F3
//    unmerge C3
//    insertcol/insertrow C5
//    deletecol/deleterow C5:E7
//    movepaste/moveinsert A1:B5 A8 all/formulas/format (if insert, destination must be in same rows or columns or else paste done)
//    sort cr1:cr2 col1 up/down col2 up/down col3 up/down
//    name define NAME definition
//    name desc NAME description
//    name delete NAME
//    recalc
//    redisplay
//    changedrendervalues
//    startcmdextension extension rest-of-command
//    sendemail ??? eddy ???

/**
All Operations implement the same Interface:

Operation#transformAgainst(op, side) : Operation // transforms this op against the passed on in-place. `side` is for tie-breaking.
Operation#serialize() : string // Returns the corresponding SocialCalc command (without newline)
Operation.parse(cmd:String) : Array<Operation>|false // Checks if the SocialCalc command is equivalent to the Operation type, if so: returns the corresponding operation(s), else it returns false.
Operation.hydrade(obj) : Operation // turns a plain object into an Operation instance
*/

function Set(target, attribute, value) {
  this.type = 'Set'
  this.target = target
  this.attribute = attribute
  this.value = value
  this.hasEffect = true // Can become effectless upon transformation
}

Set.hydrate = function(obj) {
  return new Set(obj.target, obj.attribute, obj.value)
}

Set.prototype.transformAgainst = function(op2, side) {
  if('Set' === op2.type) {
    if(op2.target !== this.target) return this
    if(side) this.hasEffect = false
  }
  return this
}

Set.prototype.serialize = function() {
  if(!this.hasEffect) return ''
  return 'set '+this.target+' '+this.attribute+' '+this.value
}

Set.parse = function(cmdstr) {
  if(0 !== cmdstr.indexOf('set')) return
  var parts = cmdstr.split(' ')
    , cmd = parts[0]
    , target = parts[1]
    , attr = parts[2]
    , value = cmdstr.substr(cmd.length+1+target.length+1+attr.length+1)

  // if this a range?
  if(~target.indexOf(':')) {
    return resolveRange(target).map((target) => new Set(target, attr, value))
  }else {
    return [new Set(target, attr, value)]
  }
}

function resolveRange(range) {
  if(!range.indexOf(':')) throw new Error('not a range.')
  var parts = range.split(':')
    , start = parts[0]
    , end = parts[1]
  var cells = []
  for (var i=start[0]; colsLessOrEqual(i,end[0]); i = incCol(i)) {
    for (var j=parseInt(start[1]); j < parseint(end[1]); j++) {
      cells.push(i+j)
    }
  }
  return cells
}

function colsLessOrEqual(col1, col2) {
  if(col1.length === col2.length) {
    return col1 <= col2
  }
  col1.length <= col2.length
}

const cols = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split()
function incCol(col) {
  var newCol
  if(col.length === 1) {
    newCol = incColSimple(col)
    if(newCol) return newCol
  }
  var i=col.length-1
  while(col[i] && !newCol) {
    newCol = incColSimple(col[i])
    i--
  }
  if(i < 0) return (new Array(col.length+1)).map(() => 'A').join('')
  return (new Array(col.length))
  .map((j) => j < i? col[j] : j==i? newCol : 'A')
  .join('')
}
function incColSimple() { 
  return cols[ols.indexOf(col)+1]
}

