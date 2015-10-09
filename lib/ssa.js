'use strict';

var binarySearch = require('binary-search');
var BitField = require('bitfield.js');

function Phi(index, node) {
  this.index = index;
  this.node = node;
}

Phi.sort = function sort(a, b) {
  return a.index - b.index;
};

function SSA(pipeline) {
  this.pipeline = pipeline;

  this.visited = new BitField(this.pipeline.blocks.length);

  // List of phis for each block
  this.phi = new Array(this.pipeline.blocks.length);
  for (var i = 0; i < this.phi.length; i++)
    this.phi[i] = [];

  this.maxStore = 0;

  this.env = null;
}
module.exports = SSA;

SSA.create = function create(pipeline) {
  return new SSA(pipeline);
};

SSA.prototype.compute = function compute() {
  // Construct phis and insert them into `this.phi` array
  this.construct();

  // Insert and assign phis to `ssa:load`s
  // aka `search` from Cytron's paper
  this.search();

  // Remove phis with no uses
  this.reduce();
};

SSA.prototype.construct = function construct() {
  for (var i = 0; i < this.pipeline.blocks.length; i++) {
    var block = this.pipeline.blocks[i];

    // NOTE: we are adding nodes, so it is important to go in reverse order
    for (var j = block.nodes.length - 1; j >= 0; j--) {
      var node = block.nodes[j];

      if (node.opcode === 'ssa:store')
        this.putPhi(block, node);
    }
  }
};

SSA.prototype.putPhi = function putPhi(block, node) {
  this.maxStore = Math.max(this.maxStore, node.literals[0]);

  this.visited.wipe();

  var queue = block.frontier.slice();
  while (queue.length !== 0) {
    var frontier = queue.pop();
    if (!this.visited.set(frontier.blockIndex))
      continue;

    for (var i = 0; i < frontier.frontier.length; i++)
      queue.push(frontier.frontier[i]);

    var list = this.phi[frontier.blockIndex];
    var phi = new Phi(node.literals[0], null);

    var index = binarySearch(list, phi, Phi.sort);

    // Insert new Phi only once
    if (index >= 0)
      continue;

    var phiNode = this.pipeline.create('ssa:phi');
    phi.node = phiNode;

    list.splice(-1 - index, 0, phi);
    phiNode.splitControl(frontier);
    frontier.prepend(phiNode);
  }
};

SSA.prototype.search = function search() {
  // Create environment to hold stacks for every variable
  this.env = new Array(this.maxStore + 1);
  for (var i = 0; i < this.env.length; i++)
    this.env[i] = [];

  var queue = [ this.pipeline.blocks[0] ];
  while (queue.length !== 0) {
    var block = queue[queue.length - 1];

    // Process `left` child first, `right` - last for correct phi input order
    for (var i = block.children.length - 1; i >= 0; i--)
      queue.push(block.children[i]);

    this.searchEnter(block);

    // We have some children to process
    if (block.children.length !== 0)
      continue;

    // Leave blocks on the right-most branch
    while (true) {
      block = queue.pop();
      this.searchLeave(block);

      if (queue.length === 0)
        break;

      var parent = queue[queue.length - 1];
      if (parent.children.length === 0)
        break;

      if (parent.children[parent.children.length - 1] !== block)
        break;
    }
  }
};

SSA.prototype.envStore = function envStore(block, index, node) {
  var stack = this.env[index];

  if (stack.length === 0 || stack[stack.length - 1].block !== block) {
    stack.push(node);
    return;
  }

  // Replace the last value within the block
  stack[stack.length - 1] = node;
};

SSA.prototype.addPhiInput = function addPhiInput(block, phi) {
  var phiNode = phi.node;
  var stack = this.env[phi.index];
  var input;
  if (stack.length === 0) {
    // Create and return `ssa:undefined`
    var undef = this.pipeline.create('ssa:undefined');
    if (block.getLastControl() === null)
      block.add(undef);
    else
      block.insert(block.nodes.length - 1, undef);

    input = undef;
  } else {
    input = stack[stack.length - 1];
  }

  phiNode.addInput(input);
};

SSA.prototype.searchEnter = function searchEnter(block) {
  // Process phis
  var phi = this.phi[block.blockIndex];
  for (var i = 0; i < phi.length; i++)
    this.envStore(block, phi[i].index, phi[i].node);

  for (var i = 0; i < block.nodes.length; i++) {
    var node = block.nodes[i];

    if (node.opcode === 'ssa:store') {
      this.envStore(block, node.literals[0], node.inputs[0]);
      block.remove(i);
      this.pipeline.remove(node);
      i--;
      continue;
    }

    if (node.opcode !== 'ssa:load')
      continue;

    var stack = this.env[node.literals[0]];
    if (stack.length === 0) {
      // Create and return `ssa:undefined`
      var undef = this.pipeline.create('ssa:undefined');
      block.insert(i, undef);
      i++;

      // Reuse single `ssa:undefined` within the block
      stack.push(undef);
    }

    var replacement = stack[stack.length - 1];
    node.replace(replacement);
    block.remove(i);
    this.pipeline.remove(node);
    i--;
  }

  for (var i = 0; i < block.successors.length; i++) {
    var succ = block.successors[i];
    var phi = this.phi[succ.blockIndex];

    for (var j = 0; j < phi.length; j++)
      this.addPhiInput(block, phi[j]);
  }
};

SSA.prototype.searchLeave = function searchLeave(block) {
  for (var i = 0; i < this.env.length; i++) {
    var stack = this.env[i];
    if (stack.length === 0)
      continue;

    // We only push once per block
    if (stack[stack.length - 1].block === block)
      stack.pop();
  }
};

SSA.prototype.reduce = function reduce() {
  for (var i = 0; i < this.pipeline.blocks.length; i++) {
    var block = this.pipeline.blocks[i];

    // Find offset of the last phi
    for (var j = 0; j < block.nodes.length; j++) {
      var node = block.nodes[j];
      if (node.opcode !== 'ssa:phi')
        break;
    }
    j--;

    for (; j >= 0; j--) {
      var node = block.nodes[j];

      if (node.opcode !== 'ssa:phi')
        break;

      if (node.uses.length !== 0)
        continue;

      block.remove(j);

      // Remove `ssa:undefined` in predecessor blocks
      this.reduceUndefined(block, node);

      // `.remove()` empties node inputs
      this.pipeline.remove(node);
    }
  }
};

SSA.prototype.reduceUndefined = function reduceUndefined(block, phi) {
  for (var i = 0; i < phi.inputs.length; i++) {
    var input = phi.inputs[i];
    if (input.opcode !== 'ssa:undefined')
      continue;

    // Somehow this `ssa:undefined` is used elsewhere
    if (input.uses.length !== 2)
      continue;

    // Input should come from right branch
    var pred = block.predecessors[i];

    // `ssa:undefined` are inserted at the end of the block
    for (var j = pred.nodes.length - 1; j >= 0; j--) {
      var node = pred.nodes[j];
      if (node !== input)
        continue;

      pred.remove(j);
      this.pipeline.remove(node);
      break;
    }
  }
};
