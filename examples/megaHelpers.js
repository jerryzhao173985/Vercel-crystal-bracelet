/* =====================================================================
   megaHelpers.js   – everything returns a value
   ===================================================================== */

/* 1. Declaration (hoisted) */
function greet(name)        { return `Hello, ${name}!`; }

/* 2. Arrow concise */
const cube   = n => n ** 3;

/* 3. Arrow with block & explicit return */
const bmi    = (w, h) => { return +(w / (h/100)**2).toFixed(1); };

/* 4. Function expression (named) */
const factorial = function fact(n) {
  return n < 2 ? 1 : n * fact(n-1);
};

/* 5. Generator that returns array via spread */
function* fib(n) {
  let a = 0, b = 1;
  while (n--) { yield a; [a,b] = [b,a+b]; }
}
const fibSeq = n => [...fib(n)];

/* 6. Closure factory */
function makeAdder(step) {
  return x => x + step;
}
const add10 = makeAdder(10);

/* 7. Date formatter (returns string) */
const ymd = date => new Date(date).toISOString().slice(0,10);

/* 8. Object return */
const stats = arr => ({
  min : Math.min(...arr),
  max : Math.max(...arr),
  sum : arr.reduce((a,b)=>a+b,0)
});

/* 9. Async that *still* returns something synchronously via .then */
const id = (()=>{ let x=0; return ()=>++x; })();

/* 10. Export object so both collection paths succeed */
module.exports = {
  greet, cube, bmi, factorial, fibSeq,
  add10, ymd, stats, id
};
