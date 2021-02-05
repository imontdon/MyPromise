console.warn('my promise -----')
const PENDING = Symbol.for('PENDING')
const FULFILLED = Symbol.for('FULFILLED')
const REJECTED = Symbol.for('REJECTED')

function MyPromise(handler) {
  this.value = ''
  this.status = PENDING
  this.reason = null
  // this._fulfilled = null 
  // this._rejected = null
  // 2.2.6.1/2
  this._fulfilledList = []
  this._rejectedList = []
  this.reslove = (value) => {
    if (this.status === PENDING) {
      this.status = FULFILLED
      this.value = value
      // if (this._fulfilled) { // 2.2.2.1 it must be called after `promise` is fulfilled, with `promise`’s fulfillment value as its first argument.
      //   queueMicrotask(() => { //  2.2.2.2 fulfilled after a delay
      //     this._fulfilled(this.value)
      //   })
      // }
      this._fulfilledList.forEach(fulfilled => { // 2.2.6
        queueMicrotask(() => { // 2.2.2.2 fulfilled after a delay
          fulfilled()
        })
      })
    }
  }
  this.reject = (reason) => {
    if (this.status === PENDING) {
      this.status = REJECTED
      this.reason = reason

      // if (this._rejected) {
      //   queueMicrotask(() => {
      //     this._rejected(this.reason)
      //   })
      // }
      this._rejectedList.forEach(rejected => {
        queueMicrotask(() => {
          rejected()
        })
      })
      
    }
  }
  try {
    handler(this.reslove, this.reject)
  } catch(e) {
    this.reject(e)
  }
  this.then = function(onFulfilled, onRejected) {
    // 2.2.1 Both `onFulfilled` and `onRejected` are optional arguments. 2.2.1.1: If `onFulfilled` is not a function, it must be ignored. applied to a directly-rejected promise `onFulfilled` is `undefined`:
    const fulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value
    // 2.2.7.4: If `onRejected` is not a function and `promise1` is rejected, `promise2` must be rejected with the same reason. `onRejected` is `false` immediately-rejected:
    const rejected = typeof onRejected === 'function' ? onRejected : reason => { throw reason }

    // const that = this
    // 2.2.6 `then` may be called multiple times on the same promise.
    // 2.2.7: `then` must return a promise
    const promise = new MyPromise((resolve, reject) => {
      queueMicrotask(() => {
        try { // 2.2.7.2
          if (this.status === FULFILLED) {
            // 2.2.2 If `onFulfilled` is a function, 
            if (typeof onFulfilled === 'function') {
              // 加入全局的，这边去掉
              // queueMicrotask(() => {  // 2.2.3 already-fulfilled - 2.2.2.2 fulfilled after a delay
                const x = fulfilled(this.value)
                // resolve(x) // 上个onfulfilled的return给下一个
                resolvePromise(promise, x, resolve, reject)
              // })
            } else { // onFulfilled !== 'function' 2.2.7.3
              resolve(this.value) // promise2 接受 promise1的resolve(value)
            }
          } else if (this.status === REJECTED) {
            if (typeof onRejected === 'function') {
              // queueMicrotask(() => {
                const x = rejected(this.reason)
                resolvePromise(promise, x, resolve, reject)
              // })
            } else {
              reject(this.reason)
            }
          } else {
            // this._fulfilled = fulfilled  // 2.2.2.1: it must be called after `promise` is fulfilled
            // resolve那边需要处理fulfilled返回的结果然后继续处理，所以不能简单push fulfilled
            // this._fulfilledList.push(fulfilled)
            // this._rejectedList.push(rejected)
            // resolve那边异步了，这边就不用加了
            this._fulfilledList.push(() => { // 2.2.6.1 eventually-fulfilled - multiple boring fulfillment handlers
              try { // 2.2.7.2: If either `onFulfilled` or `onRejected` throws an exception `e`, `promise2` must be rejected with `e` as the reason. The reason is `undefined` eventually-fulfilled:
                const x = fulfilled(this.value) // resolve 延迟问题
                resolvePromise(promise, x, resolve, reject)
              } catch(e) {
                reject(e)
              }
            })
            this._rejectedList.push(() => {
              try {
                const x = rejected(this.reason)
                resolvePromise(promise, x, resolve, reject)
              } catch(e) {
                reject(e)
              }
            })
          }
  
          // 第一版
          // 2.2.2 If `onFulfilled` is a function, 
          // if (typeof onFulfilled === 'function') {
          //   if (this.status === PENDING) {
          //     // this._fulfilled = fulfilled  // 2.2.2.1: it must be called after `promise` is fulfilled
          //     // resolve那边异步了，这边就不用加了
          //     this._fulfilledList.push(() => { // 2.2.6.1 eventually-fulfilled - multiple boring fulfillment handlers
          //       const x = fulfilled(this.value) // resolve 延迟问题
          //       resolvePromise(promise, x, resolve, reject)
          //     })
          //   } else if (this.status === FULFILLED) { // 2.2.3 already-fulfilled
          //     queueMicrotask(() => {
          //       const x = fulfilled(this.value) // 2.2.2.2 fulfilled after a delay
          //       // resolve(x) // 上个onfulfilled的return给下一个
          //       resolvePromise(promise, x, resolve, reject)
          //     })
          //   }
          // } else { // onFulfilled !== 'function' 2.2.7.3
          //   if (this.status === FULFILLED) {
          //     resolve(this.value) 
          //   }
          // }
          // if (typeof onRejected === 'function') {
          //   if (this.status === PENDING) {
          //     this._rejectedList.push(() => {
          //       const x = rejected(this.reason)
          //       resolvePromise(promise, x, resolve, reject)
          //     })
          //   } else if (this.status === REJECTED) {
          //     queueMicrotask(() => { 
          //       const x = rejected(this.reason)
          //       resolvePromise(promise, x, resolve, reject)
          //     })
          //   }
          // } else {
          //   if (this.status === REJECTED) { // 2.2.7.4
          //     reject(this.reason)
          //   }
          // }
        } catch(e) {
          reject(e)
        }
      })
    })
    return promise
  }
}

function resolvePromise(promise, x, resolve, reject) {
  if (x === promise) { // 2.3.1
    reject(new TypeError(`2.3.1 TypeError as the reason.`))
  } else if (x instanceof MyPromise) {
    x.then(y => { // 2.3.2.1
      resolvePromise(promise, y, resolve, reject)
    }, reject)
  } else if (typeof x === 'object' || typeof x === 'function') { // 2.3.3
    if (x === null) {
      resolve(x)
    }
    // if (typeof x === 'object') {
      // 2.3.3.1: Let `then` be `x.then` `x` is an object with null prototype via return from a fulfilled promise:
      try {
        // 2.3.3.2 If retrieving the property `x.then` results in a thrown exception `e`, reject `promise` with `e` as the reason. `e` is `null` via return from a fulfilled promise:
        let then = x.then

        // 2.2.2.3 If `onFulfilled` is a function it must not be called more than once
        let called = false

        if (typeof then === 'function') {
          try {
            // 2.3.3: Otherwise, if `x` is an object or function, 
            // 2.3.3.3: If `then` is a function, call it with `x` as `this`, first argument `resolvePromise`, and second argument `rejectPromise`
            // 2.3.3.3.2: If/when `rejectPromise` is called with reason `r`, reject `promise` with `r` `r` is `undefined` `then` calls `rejectPromise` synchronously via return from a rejected promise:
            then.call(x, y => {
              if (called) return
              called = true
              resolvePromise(promise, y, resolve, reject)
            }, r => {
              if (called) return
              called = true
              reject(r)
            })

          } catch (e) { // 2.2.2.3 If `onFulfilled` is a function it must not be called more than once
            if (called) return 
            reject(e)
          }
        } else { // 2.3.3: Otherwise, if `x` is an object or function, 2.3.3.4: If `then` is not a function, fulfill promise with `x` "before each" hook:
          resolve(x)
        }
      } catch(e) {
        reject(e)
      }
    // }
  } else { // 2.3.4 If `x` is not an object or function, fulfill `promise` with `x` 
    resolve(x)
  }
}
MyPromise.deferred = function() {
  let defer = {}
  defer.promise = new MyPromise((resolve, reject) => {
    defer.resolve = resolve
    defer.reject = reject
  })
  return defer
}






// e.g: 2.2.2
let d
// e.g: 2.2.2.2 fulfilled after a delay
let isFulfilled = false
// 2.2.4
let thenHasReturned = false
const p = new MyPromise((resolve, reject)=> {
  // 2.2.2
  d = resolve

  // 2.2.2.3
  // resolve('2.2.2.3 already-fulfilled')

  // resolve('2.2.4')

  // resolve('2.2.6')

  // resolve('2.2.7')
})

{ // 2.2.2.2 && 2.2.4
  // p.then(res => {
  //   // console.log(res, isFulfilled) // 2.2.2.2
  //   console.log(res, thenHasReturned) // 2.2.4
  // })
  // thenHasReturned = true
}



{ // 2.2.6
  // let i = 0
  // p.then(res => {
  //   console.log(res, ++i)
  //   // return 'ret'
  //   return p1
  // }).then(ret => {
  //   console.log(ret, ++i)
  // })
  // setTimeout(() => {
  //   d('2.2.6') // 2.2.6.1
  // }, 500)

  // new MyPromise((_, reject) => reject("a reason"))
  // .then(undefined, reason => {
  //   console.log(1, reason);
  //   throw reason;
  // })
  // .then(undefined, reason => {
  //   console.log(2, reason);
  //   throw reason;
  // })
  // .then(undefined, reason => {
  //   console.log(3, reason);
  //   throw reason;
  // });
}

{ // 2.2.7
  // const promise1 = new MyPromise(resolve => resolve("done"));
  // const promise2 = promise1.then(() => {
  //   throw Error("some reason");
  // });
  // promise2.then(undefined, 5)

  // const promise1 = new MyPromise(resolve => resolve("done"));
  // const promise2 = promise1.then(() => {
  //   throw Error("some reason");
  // });
  // promise2.then(undefined, reason => {
  //   console.log(reason);
  // });
  // console.log(promise2)
  // promise2.then(undefined, reason => {
  //   console.log('catch: ', reason);
  //   console.log(promise2)
  // });
}

{ // 2.3.2
  // let d1
  // const p1 = new MyPromise((resolve, reject) => {
  //   // resolve('p1')
  //   d1 = resolve
  //   // d1 = reject
  // })
  // p.then(res => {
  //   console.log(res)
  //   return p1 // 2.3.2.2
  // }).then(ret => {
  //   console.log(ret, 'new MyPromise')
  // }, e => {
  //   console.log('catch: ', e)
  // })
  // setTimeout(() => {
  //   // d1('2.3.2.1')
  //   d1({ a: 2, d: 'hhhhh', then: function() {
  //     console.log('asdasd', this.d)
  //   } })
  // }, 500)
}


{ // 2.2.2.1
  // p.then(res => {
  //   console.log(res)
  // })
  // d('2.2.2.1')
}

{ // 2.2.2
  // setTimeout(() => {
  //   d('2.2.2')
  //   console.log(p, 'setTimeout')
  //   // 2.2.2.2 fulfilled after a delay
  //   isFulfilled = true
  // }, 50)
}
module.exports = MyPromise