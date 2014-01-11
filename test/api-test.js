var assert = require('assert');
var ssa = require('ssa-ir');
var phi = require('..');

describe('Phi.js', function() {
  function strip(source) {
    var lines = source.split(/\r\n|\r|\n/g);

    var out = lines.map(function(line) {
      return line.replace(/^\s*/, '');
    }).filter(function(line) {
      return !!line;
    });

    return out.join('\n');
  }

  function test(name, input, expected) {

    it('should support ' + name, function() {
      var output = ssa.stringify(phi.run(ssa.parse(input)));
      var exp = expected.toString()
                        .replace(/^function.*{\/\*|\*\/}$/g, '');
      assert.equal(strip(output), strip(exp));
    });
  }

  describe('local phis', function() {
    test('linear flow', function() {/*
      block B1
        @a = literal %0
        i3 = literal %1
        @a = add @a, i3
        ret @a
    */}, function() {/*
      block B1
        ssa/a0 = literal %0
        i3 = literal %1
        ssa/a1 = add ssa/a0, i3
        ret ssa/a1
    */});
  });

  describe('global phis', function() {
    test('if/else', function() {/*
      block B1 -> B2, B3
        branch
      block B2 -> B4
        @a = literal %1
      block B3 -> B4
        @a = literal %2
      block B4
        ret @a
    */}, function() {/*
      block B1 -> B2, B3
        branch
      block B2 -> B4
        ssa/a0 = literal %1
        to_phi ssa/a1, ssa/a0
      block B3 -> B4
        ssa/a2 = literal %2
        to_phi ssa/a1, ssa/a2
      block B4
        ssa/a1 = phi
        ret ssa/a1
    */});

    test('simple loop', function() {/*
      block Entry -> Start
        @a = 0
      block Start -> Body, Exit
        branch @a, 10
      block Body -> Start
        one = literal %1
        @a = add @a, one
      block Exit
        ret @a
    */}, function() {/*
      block Entry -> Start
        ssa/a0 = 0
        to_phi ssa/a1, ssa/a0
      block Start -> Body, Exit
        ssa/a1 = phi
        branch ssa/a1, 10
      block Body -> Start
        one = literal %1
        ssa/a2 = add ssa/a1, one
        to_phi ssa/a1, ssa/a2
      block Exit
        ret ssa/a1
    */});
  });
});
