
import {
  createSymbolOrString
} from 'tko.utils';

import {
  unwrap
} from 'tko.observable';


export default function Node(lhs, op, rhs) {
  this.lhs = lhs;
  this.op = op;
  this.rhs = rhs;
}

/**
 * @ operator - call the identifier if a function; and unwrap any result
 * @param  {operand} a ignored
 * @param  {operand} b The variable to be called (if a function) and unwrapped
 * @return {value}   The result.
 */
function unwrapOrCall(a, b) {
  return unwrap(typeof b === 'function' ? b() : b);
}

var operators = {
  // unary
  '@': unwrapOrCall,
  '!': function not(a, b) { return !b; },
  '!!': function notnot(a, b) { return !!b; },
  '++': function preinc(a, b) { return ++b; },
  '--': function preinc(a, b) { return --b; },
  // mul/div
  '*': function mul(a, b) { return a * b; },
  '/': function div(a, b) { return a / b; },
  '%': function mod(a, b) { return a % b; },
  // sub/add
  '+': function add(a, b) { return a + b; },
  '-': function sub(a, b) { return a - b; },
  // relational
  '<': function lt(a, b) { return a < b; },
  '<=': function le(a, b) { return a <= b; },
  '>': function gt(a, b) { return a > b; },
  '>=': function ge(a, b) { return a >= b; },
  //    TODO: 'in': function (a, b) { return a in b; },
  //    TODO: 'instanceof': function (a, b) { return a instanceof b; },
  // equality
  '==': function equal(a, b) { return a === b; },
  '!=': function ne(a, b) { return a !== b; },
  '===': function sequal(a, b) { return a === b; },
  '!==': function sne(a, b) { return a !== b; },
  // bitwise
  '&': function bit_and(a, b) { return a & b; },
  '^': function xor(a, b) { return a ^ b; },
  '|': function bit_or(a, b) { return a | b; },
  // logic
  '&&': function logic_and(a, b) { return a && b; },
  '||': function logic_or(a, b) { return a || b; }
};

/* In order of precedence, see:
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence#Table
*/

// Our operator - unwrap/call
operators['@'].precedence = 1;

  // logical not
operators['!'].precedence = 4;
operators['!!'].precedence = 4; // explicit double-negative
  // multiply/divide/mod
operators['*'].precedence = 5;
operators['/'].precedence = 5;
operators['%'].precedence = 5;
  // add/sub
operators['+'].precedence = 6;
operators['-'].precedence = 6;
  // relational
operators['<'].precedence = 8;
operators['<='].precedence = 8;
operators['>'].precedence = 8;
operators['>='].precedence = 8;
// operators['in'].precedence = 8;
// operators['instanceof'].precedence = 8;
  // equality
operators['=='].precedence = 9;
operators['!='].precedence = 9;
operators['==='].precedence = 9;
operators['!=='].precedence = 9;
  // bitwise
operators['&'].precedence = 10;
operators['^'].precedence = 11;
operators['|'].precedence = 12;
  // logic
operators['&&'].precedence = 13;
operators['||'].precedence = 14;
  // Prefix inc/dec
operators['++'].precedence = 15;
operators['--'].precedence = 15;

Node.operators = operators;


Node.prototype.get_leaf_value = function (leaf, member_of) {
  if (typeof(leaf) === 'function') {
    // Expressions on observables are nonsensical, so we unwrap any
    // function values (e.g. identifiers).
    return unwrap(leaf());
  }

  // primitives
  if (typeof(leaf) !== 'object') {
    return member_of ? member_of[leaf] : leaf;
  }

  // Identifiers and Expressions
  if (leaf[Node.isExpressionOrIdentifierSymbol]) {
    // lhs is passed in as the parent of the leaf. It will be defined in
    // cases like a.b.c as 'a' for 'b' then as 'b' for 'c'.
    return unwrap(leaf.get_value(member_of));
  }

  if (leaf instanceof Node) {
    return leaf.get_node_value(member_of);
  }

  throw new Error("Invalid type of leaf node: " + leaf);
};

/**
 * Return a function that calculates and returns an expression's value
 * when called.
 * @param  {array} ops  The operations to perform
 * @return {function}   The function that calculates the expression.
 *
 * Exported for testing.
 */
Node.prototype.get_node_value = function () {
  return this.op(this.get_leaf_value(this.lhs),
                 this.get_leaf_value(this.rhs));
};


//
// Class variables.
//
Node.isExpressionOrIdentifierSymbol = createSymbolOrString("isExpressionOrIdentifierSymbol");


Node.value_of = function value_of(item) {
  if (item && item[Node.isExpressionOrIdentifierSymbol]) {
    return item.get_value();
  }
  return item;
};


/**
*  Convert an array of nodes to an executable tree.
*  @return {object} An object with a `lhs`, `rhs` and `op` key, corresponding
*                      to the left hand side, right hand side, and
*                      operation function.
*/
Node.create_root = function create_root(nodes) {
  var root, leaf, op, value;

  // Prime the leaf = root node.
  leaf = root = new Node(nodes.shift(), nodes.shift(), nodes.shift());

  while (nodes) {
    op = nodes.shift();
    value = nodes.shift();
    if (!op) {
      break;
    }
    if (op.precedence > root.op.precedence) {
      // rebase
      root = new Node(root, op, value);
      leaf = root;
    } else {
      leaf.rhs = new Node(leaf.rhs, op, value);
      leaf = leaf.rhs;
    }
  }
  // console.log("tree", root)
  return root;
};
