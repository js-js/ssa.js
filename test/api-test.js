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
        i7 = return ^b0, i6
      }
    }
  */}, function() {/*
    pipeline {
      b0 {
        i0 = ssa:undefined
        i1 = print i0
        i2 = literal 1
        i3 = literal 2
        i4 = add i3, i2
        i5 = return ^b0, i4
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
        i4 = jump ^b0
      }
      b0 -> b1

      b1 {
        i5 = literal 2
        i6 = ssa:load 0
        i7 = add i5, i6
        i8 = return ^b1, i7
      }
    }
  */}, function() {/*
    pipeline {
      b0 {
        i0 = ssa:undefined
        i1 = print i0
        i2 = literal 1
        i3 = jump ^b0
      }
      b0 -> b1

      b1 {
        i4 = literal 2
        i5 = add i4, i2
        i6 = return ^b1, i5
      }
    }
  */});

  test('basic branch-merge', function() {/*
    pipeline {
      b0 {
        i0 = if ^b0
      }
      b0 -> b1, b2

      b1 {
        i1 = literal 1
        i2 = ssa:store 0, i1
        i3 = jump ^b1
      }
      b1 -> b3

      b2 {
        i4 = literal 2
        i5 = ssa:store 0, i4
        i6 = jump ^b2
      }
      b2 -> b3

      b3 {
        i7 = ssa:load 0
        i8 = return ^b3, i7
      }
    }
  */}, function() {/*
    pipeline {
      b0 {
        i0 = if ^b0
      }
      b0 -> b1, b2
      b1 {
        i1 = literal 1
        i2 = jump ^b1
      }
      b1 -> b3
      b2 {
        i3 = literal 2
        i4 = jump ^b2
      }
      b2 -> b3
      b3 {
        i5 = ssa:phi ^b3, i1, i3
        i6 = return ^i5, i5
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
        i2 = if ^b0
      }
      b0 -> b1, b5

      b1 {
        i3 = if ^b1
      }
      b1 -> b2, b3

      b2 {
        i4 = literal 1
        i5 = ssa:store 0, i4
        i6 = jump ^b2
      }
      b2 -> b4

      b3 {
        i7 = literal 2
        i8 = ssa:store 0, i7
        i9 = jump ^b3
      }
      b3 -> b4

      b4 {
        i10 = jump ^b4
      }
      b4 -> b9

      b5 {
        i11 = jump ^b5
      }
      b5 -> b6, b7

      b6 {
        i12 = literal 3
        i13 = ssa:store 0, i12
        i14 = jump ^b6
      }
      b6 -> b8

      b7 {
        i15 = literal 4
        i16 = ssa:store 0, i15
        i17 = jump ^b7
      }
      b7 -> b8

      b8 {
        i18 = jump ^b8
      }
      b8 -> b9

      b9 {
        i19 = ssa:load 0
        i20 = ssa:load 1
        i21 = add i19, i20
        i22 = return ^b9, i21
      }
    }
  */}, function() {/*
    pipeline {
      b0 {
        i0 = literal "pass-through"
        i1 = if ^b0
      }
      b0 -> b1, b5
      b1 {
        i2 = if ^b1
      }
      b1 -> b2, b3
      b2 {
        i3 = literal 1
        i4 = jump ^b2
      }
      b2 -> b4
      b3 {
        i5 = literal 2
        i6 = jump ^b3
      }
      b3 -> b4
      b4 {
        i7 = ssa:phi ^b4, i3, i5
        i8 = jump ^i7
      }
      b4 -> b9
      b5 {
        i9 = jump ^b5
      }
      b5 -> b6, b7
      b6 {
        i10 = literal 3
        i11 = jump ^b6
      }
      b6 -> b8
      b7 {
        i12 = literal 4
        i13 = jump ^b7
      }
      b7 -> b8
      b8 {
        i14 = ssa:phi ^b8, i10, i12
        i15 = jump ^i14
      }
      b8 -> b9
      b9 {
        i16 = ssa:phi ^b9, i7, i14
        i17 = add i16, i0
        i18 = return ^i16, i17
      }
    }
  */});

  test('reduce phi in loop', function() {/*
    pipeline {
      b0 {
        i0 = jump ^b0
      }
      b0 -> b1

      b1 {
        i1 = if ^b1
      }
      b1 -> b2, b3

      b2 {
        i2 = literal 1
        i3 = ssa:store 0, i2
        i4 = ssa:load 0
        i5 = jump ^b2
      }
      b2 -> b1

      b3 {
        i6 = literal 0
        i7 = return ^b3, i6
      }
    }
  */}, function() {/*
    pipeline {
      b0 {
        i0 = jump ^b0
      }
      b0 -> b1
      b1 {
        i1 = if ^b1
      }
      b1 -> b2, b3
      b2 {
        i2 = literal 1
        i3 = jump ^b2
      }
      b2 -> b1
      b3 {
        i4 = literal 0
        i5 = return ^b3, i4
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
        i6 = return ^b3, i5
      }
    }
  */}, function() {/*
    pipeline {
      b0 {
        i0 = if ^b0
      }
      b0 -> b1, b2
      b1 {
        i1 = ssa:undefined
        i2 = jump ^b1
      }
      b1 -> b3
      b2 {
        i3 = literal 1
        i4 = jump ^b2
      }
      b2 -> b3
      b3 {
        i5 = ssa:phi ^b3, i1, i3
        i6 = return ^i5, i5
      }
    }
  */});
});
