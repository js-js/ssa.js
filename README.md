# SSA.js
[![Build Status](https://secure.travis-ci.org/js-js/ssa.js.png)](http://travis-ci.org/js-js/ssa.js)
[![NPM version](https://badge.fury.io/js/ssa.js.svg)](http://badge.fury.io/js/ssa.js)

Construction of minimal SSA form

## Usage

```javascript
var pipeline = require('json-pipeline').create('dominance');

// init pipeline somehow

var ssa = require('ssa.js').create(pipeline);

ssa.compute();

// Print outputs
console.log(pipeline.render({ cfg: true }, 'printable'));
```

See [json-pipeline][0] for details on representation format.

#### LICENSE

This software is licensed under the MIT License.

Copyright Fedor Indutny, 2015.

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the
following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
USE OR OTHER DEALINGS IN THE SOFTWARE.

[0]: https://github.com/indutny/json-pipeline/blob/master/design.md
