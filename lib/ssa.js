var assert = require('assert');
var tarjan = require('tarjan').create();

function SSA(input) {
  this.input = input;
  this.counters = {};
  this.stacks = {};
  this.map = {};
  this.predecessors = {};
  this.prefix = 'ssa/';
}
module.exports = SSA;

SSA.run = function run(input) {
  return new SSA(input).run();
};

SSA.prototype.run = function run() {
  var input = this.input;

  // Construct dominator tree and find dominance frontier
  tarjan(input);

  // Construct map of blocks by id
  for (var i = 0; i < input.length; i++) {
    var block = input[i];
    this.map[block.id] = block;
    this.predecessors[block.id] = [];
  }

  // Construct predecessors map
  for (var i = 0; i < input.length; i++) {
    var block = input[i];
    for (var j = 0; j < block.successors.length; j++) {
      var succ = block.successors[j];

      this.predecessors[succ].push(block);
    }
  }

  // Insert phis at frontiers
  this.insertSSAs();

  // Replace variables with ids
  this.search(input[0]);

  return input;
};

SSA.prototype.insertSSAs = function insertSSAs() {
  var input = this.input;
  var inserted = {};
  var index = 0;

  for (var i = 0; i < input.length; i++) {
    var block = input[i];

    for (var j = 0; j < block.instructions.length; j++) {
      var instr = block.instructions[j];

      if (!instr.assign)
        continue;
      var name = instr.id;
      var queue = [ block ];
      while (queue.length > 0) {
        var current = queue.shift();
        for (var k = 0; k < current.frontier.length; k++) {
          var front = this.map[current.frontier[k]];

          if (!inserted[name])
            inserted[name] = {};
          if (inserted[name][front.id])
            continue;
          queue.push(front);
          inserted[name][front.id] = true;

          var pred = this.predecessors[front.id];
          front.instructions.unshift({
            type: 'phi',
            assign: true,
            id: name,
            inputs: []
          });

          // Insert `to_phi`
          for (var l = 0; l < pred.length; l++) {
            var b = pred[l];
            b.instructions.push({
              type: 'to_phi',
              inputs: [
                { type: 'variable', id: name },
                { type: 'variable', id: name }
              ]
            });
          }
        }
      }
    }
  }
};

SSA.prototype.push = function push(id) {
  if (!this.counters[id])
    this.counters[id] = 0;
  var counter = this.counters[id]++;
  var res = this.prefix + counter + '/' + id;

  if (!this.stacks[id])
    this.stacks[id] = [ res ];
  else
    this.stacks[id].push(res);

  return res;
};

SSA.prototype.pop = function pop(id) {
  this.stacks[id].pop();
};

SSA.prototype.search = function search(block) {
  var pushes = [];
  for (var i = 0; i < block.instructions.length; i++) {
    var instr = block.instructions[i];

    // Replace inputs
    if (instr.type !== 'phi' && instr.inputs) {
      var j = 0;

      // Skip dst in to_phi
      if (instr.type === 'to_phi')
        j++;

      for (; j < instr.inputs.length; j++) {
        var input = instr.inputs[j];

        if (input.type !== 'variable')
          continue;
        var stack = this.stacks[input.id];
        assert(stack, 'Get without assignment');
        instr.inputs[j] = { type: 'instruction', id: stack[stack.length - 1] };
      }
    }

    // Replace output
    if (instr.assign) {
      instr.assign = false;
      pushes.push(instr.id);
      instr.id = this.push(instr.id);
    }
  }

  // Replace to_phi's output in predecessors
  var pred = this.predecessors[block.id];
  for (var i = 0; i < pred.length; i++) {
    var p = pred[i];

    for (var j = p.instructions.length - 1; j >= 0; j--) {
      var to_phi = p.instructions[j];
      if (to_phi.type !== 'to_phi')
        break;

      var out = to_phi.inputs[0];
      if (out.type !== 'variable')
        continue;

      var stack = this.stacks[out.id];
      assert(stack, 'to_phi without later phi');
      to_phi.inputs[0] = { type: 'instruction', id: stack[stack.length - 1] };
    }
  }

  for (var i = 0; i < block.children.length; i++) {
    var child = this.map[block.children[i]];
    this.search(child);
  }

  // Restore .stacks
  for (var i = 0; i < pushes.length; i++)
    this.pop(pushes[i]);
};
