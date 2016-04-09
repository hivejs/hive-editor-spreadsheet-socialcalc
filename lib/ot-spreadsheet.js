var SocialCalc = require('socialcalc')

const operationsHash = {Set: Set, InsertRow: InsertRow, InsertCol: InsertCol}
const operationsList = [Set, InsertRow, InsertCol]
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

/**
 * Set operation
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
  if(op2 instanceof Set) {
    if(op2.target !== this.target) return this
    if(side) this.hasEffect = false
  }else if(op2 instanceof InsertRow && this.target !== 'sheet') {
    var otherRow = parseInt(parseCell(op2.newRow)[1])
    // If this target is a cell
    if (this.target.match(/[a-z]+[0-9]+/)) {
      var myCell = parseCell(this.target)
        , thisRow = parseInt(myCell[1])
      if (otherRow <= thisRow) return new Set(myCell[0]+(thisRow+1), this.attribute, this.value)
      else return this
    }else
    // this target is a row
    if (parseInt(this.target) !== NaN) {
      var thisRow = parseInt(this.target)
      if (otherRow <= thisRow) return new Set(thisRow+1, this.attribute, this.value)
      else return this
    }
    // if this target is a column
    else return this
  }else
  if (op2 instanceof InsertCol && this.target !== 'sheet') {
    var otherCol = parseCell(op2.newCol)[1]
    // If this target is a cell
    if (this.target.match(/[a-z]+[0-9]+/)) {
      var myCell = parseCell(this.target)
        , thisCol = myCell[0]
      if (colsLessOrEqual(otherCol, thisCol)) return new Set(incCol(thisRow)+myCell[1], this.attribute, this.value)
      else return this
    }else
    // this target is a col
    if (parseInt(this.target) === NaN) {
      var thisCol = this.target
      if (colsLessorEqual(otherCol, thisCol)) return new Set(incCol(thisCol), this.attribute, this.value)
      else return this
    }
    // if this target is a row
    else return this
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

/**
 * InsertRow operation
 */
function InsertRow(newRow) {
  this.type = 'InsertRow'
  this.newRow = newRow
}

InsertRow.hydrate = function(obj) {
  return new InsertRow(obj.newRow)
}

InsertRow.prototype.transformAgainst = function(op, left) {
  if(op instanceof InsertRow) {
    var otherCell = parseCell(op.newRow)
     , myCell = parseCell(this.newRow)
    if (otherCell[1] < myCell[1]) {
      return new InsertRow(myCell[0]+(parseInt(myCell[1])+1))
    }else if (otherCell[1] === myCell[1]) {
      if(left) return new InsertRow(myCell[0]+(parseInt(myCell[1])+1))
      else return this
    }else{
      return this
    }
  }
}

InsertRow.parse = function(cmd) {
  if(0 !== cmd.indexOf('insertrow ')) return false
  return [new InsertRow(cmd.substr('insertrow '.length))]
}

InsertRow.prototype.serialize = function() {
  return 'insertrow '+this.newRow
}

function parseCell(cell) {
  var match = cell.match(/([a-z]+)([0-9]+)/)
  if(!match) throw new Error('invalid cell id '+cell)
  return [match[1], match[2]]
}

/**
 * InsertCol operation
 */
function InsertCol(newCol) {
  this.type = 'InsertCol'
  this.newCol = newCol
}

InsertCol.hydrate = function(obj) {
  return new InsertCol(obj.newCol)
}

InsertCol.prototype.transformAgainst = function(op, left) {
  if(op instanceof InsertCol) {
    var otherCell = parseCell(op.newRow)
     , myCell = parseCell(this.newRow)
    if (colsLessorEqual(otherCell[0], myCell[0])) {
      if (otherCell[0] === myCell[0]) {
	if(left) return new InsertCol(incCol(myCell[0])+myCell[1])
	else return this
      }
      else return new InsertCol(incCol(myCell[0])+myCell[1])
    }else{
      return this
    }
  }
}

InsertCol.parse = function(cmd) {
  if(0 !== cmd.indexOf('insertcol ')) return false
  return [new InsertCol(cmd.substr('insertcol '.length))]
}

InsertCol.prototype.serialize = function() {
  return 'insertcol '+this.newCol
}

function parseCell(cell) {
  var match = cell.match(/([a-z]+)([0-9]+)/)
  if(!match) throw new Error('invalid cell id '+cell)
  return [match[1], match[2]]
}
