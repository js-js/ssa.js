var assertText = require('assert-text');
var pipeline = require('json-pipeline');
var frontier = require('dominance-frontier');

assertText.options.trim = true;

var ssa = require('../');

function fn2str(fn) {
  return fn.toString().replace(/^function[^{]+{\/\*|\*\/}$/g, '');
};

exports.test = function test(name, input, output) {
  it('should ' + name, function() {
    var p = pipeline.create('dominance');
    p.parse(fn2str(input), {
      cfg: true
    }, 'printable');
    frontier.create(p).compute();
    ssa.create(p).compute();

    p.reindex();
    assertText.equal(p.render({ cfg: true }, 'printable'),
                     fn2str(output));
  });
}
