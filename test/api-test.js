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
        ssa/0/a = literal %0
        i3 = literal %1
        ssa/1/a = add ssa/0/a, i3
        ret ssa/1/a
    */});

    test('linear flow with ids', function() {/*
      block B1
        @a = literal %0 # a
        i3 = literal %1 # b
        @a = add @a, i3 # c
        ret @a
    */}, function() {/*
      block B1
        ssa/0/a = literal %0 # a
        i3 = literal %1 # b
        ssa/1/a = add ssa/0/a, i3 # c
        ret ssa/1/a
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
        ssa/0/a = literal %1
        to_phi ssa/1/a, ssa/0/a
      block B3 -> B4
        ssa/2/a = literal %2
        to_phi ssa/1/a, ssa/2/a
      block B4
        ssa/1/a = phi
        ret ssa/1/a
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
        ssa/0/a = 0
        to_phi ssa/1/a, ssa/0/a
      block Start -> Body, Exit
        ssa/1/a = phi
        branch ssa/1/a, 10
      block Body -> Start
        one = literal %1
        ssa/2/a = add ssa/1/a, one
        to_phi ssa/1/a, ssa/2/a
      block Exit
        ret ssa/1/a
    */});
  });
});
