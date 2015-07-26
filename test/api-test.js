var fixtures = require('./fixtures');
var test = fixtures.test;

describe('SSA.js', function() {
  test('linear control-flow', function() {/*
    pipeline {
      b0 {
        i0 = ssa:load 0
        i1 = print i0
        i2 = literal 1
        i3 = ssa:store 0, i2
        i4 = literal 2
        i5 = ssa:load 0
        i6 = add i4, i5
      }
    }
  */}, function() {/*
    pipeline {
      b0 {
        i0 = ssa:undefined
        i1 = print i0
        i2 = literal 1
        i4 = literal 2
        i3 = add i4, i2
      }
    }
  */});

  test('across-the-block control-flow', function() {/*
    pipeline {
      b0 {
        i0 = ssa:load 0
        i1 = print i0
        i2 = literal 1
        i3 = ssa:store 0, i2
      }
      b0 -> b1

      b1 {
        i4 = literal 2
        i5 = ssa:load 0
        i6 = add i4, i5
      }
    }
  */}, function() {/*
    pipeline {
      b0 {
        i0 = ssa:undefined
        i1 = print i0
        i2 = literal 1
      }
      b0 -> b1

      b1 {
        i4 = literal 2
        i3 = add i4, i2
      }
    }
  */});

  test('basic branch-merge', function() {/*
    pipeline {
      b0 {
      }
      b0 -> b1, b2

      b1 {
        i0 = literal 1
        i1 = ssa:store 0, i0
      }
      b1 -> b3

      b2 {
        i2 = literal 2
        i3 = ssa:store 0, i2
      }
      b2 -> b3

      b3 {
        i4 = ssa:load 0
        i5 = return i4
      }
    }
  */}, function() {/*
    pipeline {
      b0 {
      }
      b0 -> b1, b2

      b1 {
        i0 = literal 1
      }
      b1 -> b3

      b2 {
        i2 = literal 2
      }
      b2 -> b3

      b3 {
        i1 = ssa:phi i0, i2
        i3 = return i1
      }
    }
  */});

  /*
   *        b0
   *     /      \
   *    b1       b5
   *  /   \     /   \
   * b2   b3   b6   b7
   *  \   /     \   /
   *    b4       b8
   *     \      /
   *        b9
   */
  test('nested branch-merge', function() {/*
    pipeline {
      b0 {
        i0 = literal "pass-through"
        i1 = ssa:store 1, i0
      }
      b0 -> b1, b5

      b1 {
      }
      b1 -> b2, b3

      b2 {
        i2 = literal 1
        i3 = ssa:store 0, i2
      }
      b2 -> b4

      b3 {
        i4 = literal 2
        i5 = ssa:store 0, i4
      }
      b3 -> b4

      b4 {
      }
      b4 -> b9

      b5 {
      }
      b5 -> b6, b7

      b6 {
        i6 = literal 3
        i7 = ssa:store 0, i6
      }
      b6 -> b8

      b7 {
       i8 = literal 4
       i9 = ssa:store 0, i8
      }
      b7 -> b8

      b8 {
      }
      b8 -> b9

      b9 {
        i10 = ssa:load 0
        i11 = ssa:load 1
        i12 = add i10, i11
      }
    }
  */}, function() {/*
    pipeline {
      b0 {
        i0 = literal "pass-through"
      }
      b0 -> b1, b5
      b1 {
      }
      b1 -> b2, b3
      b2 {
        i2 = literal 1
      }
      b2 -> b4
      b3 {
        i4 = literal 2
      }
      b3 -> b4
      b4 {
        i13 = ssa:phi i2, i4
      }
      b4 -> b9
      b5 {
      }
      b5 -> b6, b7
      b6 {
        i6 = literal 3
      }
      b6 -> b8
      b7 {
        i8 = literal 4
      }
      b7 -> b8
      b8 {
        i3 = ssa:phi i6, i8
      }
      b8 -> b9
      b9 {
        i9 = ssa:phi i13, i3
        i12 = add i9, i0
      }
    }
  */});

  test('reduce phi in loop', function() {/*
    pipeline {
      b0 {
      }
      b0 -> b1

      b1 {
      }
      b1 -> b2, b3

      b2 {
        i0 = literal 1
        i1 = ssa:store 0, i0
        i2 = ssa:load 0
      }
      b2 -> b1

      b3 {
      }
    }
  */}, function() {/*
    pipeline {
      b0 {
      }
      b0 -> b1

      b1 {
      }
      b1 -> b2, b3

      b2 {
        i0 = literal 1
      }
      b2 -> b1

      b3 {
      }
    }
  */});

  test('insert `ssa:undefined` before control nodes', function() {/*
    pipeline {
      b0 {
        i0 = if ^b0
      }
      b0 -> b1, b2

      b1 {
        i1 = jump ^b1
      }
      b1 -> b3

      b2 {
        i2 = literal 1
        i3 = ssa:store 0, i2
        i4 = jump ^b2
      }
      b2 -> b3

      b3 {
        i5 = ssa:load 0
        i6 = return ^b3, i2
      }
    }
  */}, function() {/*
    pipeline {
      b0 {
        i0 = if ^b0
      }
      b0 -> b1, b2
      b1 {
        i3 = ssa:undefined
        i1 = jump ^b1
      }
      b1 -> b3
      b2 {
        i2 = literal 1
        i4 = jump ^b2
      }
      b2 -> b3
      b3 {
        i5 = ssa:phi i3, i2
        i6 = return ^b3, i2
      }
    }
  */});
});
