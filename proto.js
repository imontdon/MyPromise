const { promises } = require('fs')
const { resolve, reject } = require('../js/promise3')
const MyPromise = require('./index')

MyPromise.resolve = function(value) {
  if (value instanceof MyPromise) {
    return value
  }
  return new MyPromise(resolve => {
    resolve(value)
  })
}

MyPromise.reject = function(reason) {
  return new MyPromise((resolve, reject) => {
    reject(reason)
  })
}
MyPromise.prototype.catch = function(onRejected) {
  return this.then(undefined, onRejected)
}

MyPromise.prototype.finally = function(fn) {
  // this.then(value => MyPromise) 
    // => MyPromise.resolve(fn()) 
    // => return MyPromise 
    // => MyPromise.then(() => value) 
    // => return MyPromise, MyPromise.value = value
  return this
            .then(value => MyPromise.resolve(fn()).then(() => value))
            .catch(reason => MyPromise.reject(fn())
                  // .catch(() => reason)) catch走的是reolsvePromise reolsve(x)
                  .catch(() => { throw reason })) // 这里走try {} catch(e) {}

  // 好家伙 - 学习学习
  // return this.then(
  //   value => MyPromise.resolve(fn()).then(() => value),
  //   reason => MyPromise.resolve(fn()).then(() => { throw reason })
  // )
}

MyPromise.all = function(promises) {
  const n = promises.length
  let result = []
  let count = 0
  const promise = new MyPromise((resolve, reject) => {
    if (n === 0) {
      resolve(result)
    }
    promises.forEach(p => {
      MyPromise.resolve(p).then(res => {
        result[count++] = res
        if (count === n) {
          resolve(result)
        }
      }).catch(e => {
        reject(e)
      })
    })
  })

  return promise
}

MyPromise.race = function(promises) {
  const promise = new MyPromise((resolve, reject) => {
    promises.forEach(p => {
      MyPromise.resolve(p).then(res => {
        resolve(res)
      }).catch(e => {
        reject(e)
      })
    })
  })

  return promise
}

MyPromise.allSettled = function(promises) {
  const n = promises.length
  let count = 0
  const result = []
  const promise = new MyPromise((resolve, reject) => {
    if (n === 0) {
      resolve(result)
    }
    promises.forEach(p => {
      MyPromise.resolve(p).then(res => {
        result.push({
          value: res,
          status: 'fulfilled'
        })
        if (++count === n) {
          resolve(result)
        }
      }).catch(e => {
        result.push({
          reason: e,
          status: 'rejected'
        })
        if (++count === n) {
          resolve(result)
        }
      })
    })
  })
  return promise
}

MyPromise.any = function(promises) {
  const n = promises.length
  let count = 0
  const promise = new MyPromise((resolve, reject) => {
    if (n === 0) {
      reject(`AggregateError: All promises were rejected`)
    }
    promises.forEach(p => {
      MyPromise.resolve(p).then(res => {
        resolve(res)
      }).catch(e => {
        if (++count === n) {
          reject(`AggregateError: All promises were rejected`)
        }
      })
    })
  })
  return promise
}

const p = new MyPromise((resolve, reject) => {
  reject('p')
})
const p1 = new MyPromise((resolve, reject) => {
  resolve('p1')
})


{ // any
  // MyPromise.any([
  //   MyPromise.reject(1),
  //   new MyPromise((resolve, reject) => reject('p1')), 
  //   new MyPromise((resolve, reject) => reject('p2'))
  // ]).then(res => {
  //   console.log('allSettled', res)
  // }).catch(e => {
  //   console.log(e)
  // })
  // MyPromise.any([]).then(res => {
  //   console.log('allSettled', res)
  // }).catch(e => {
  //   console.log(e)
  // })
}
{ // allSettled
  // MyPromise.allSettled([
  //   1,
  //   new MyPromise((resolve) => resolve('p1')), 
  //   new MyPromise((resolve, reject) => reject('p2'))
  // ]).then(res => {
  //   console.log('allSettled', res)
  // })
  // MyPromise.allSettled([]).then(res => {
  //   console.log('allSettled', res)
  // })
}

{ // race
  // MyPromise.race([
  //   1,
  //   new MyPromise((resolve) => resolve('p1')), 
  //   new MyPromise((resolve, reject) => reject('p2'))
  // ]).then(res => {
  //   console.log(res)
  // }).catch(e => {
  //   console.log('catch: ', e)
  // })
  // MyPromise.race([
  // ]).then(res => {
  //   console.log(res)
  // }).catch(e => {
  //   console.log('catch: ', e)
  // })
}

{ // all
  // MyPromise.all([p, p1]).then(res => {
  //   console.log('then: ', res)
  // }).catch(e => {
  //   console.log('catch: ', e)
  // })
}

{ // catch
  // p.catch(e => {
  //   console.log(e)
  // }).finally(_ => {
  //   console.log('finish')
  // })

  // p1.then(res => {
  //   console.log(res)
  // }).finally(() => {
  //   console.log('?')
  // })
}


{ // static resolve, reject
  // MyPromise.resolve('MyPromise.resolve').then(res => {
  //   console.log(res)
  // }).catch(e => {
  //   console.log('catch: ', e)
  // })
  // MyPromise.reject('MyPromise.reject').then(res => {
  //   console.log(res)
  // }).catch(e => {
  //   console.log('catch: ', e)
  // })
}

{ // finally

  // var pt = MyPromise.resolve('finally').then(() => {}, () => {})
  
  // var ptf = MyPromise.resolve('then finally').finally(() => {}, () => {}) // pf.value should be 'finally'
  
  // // reject 的值是 undefined
  // const pr = MyPromise.reject('reject').then(() => {}, () => {})
  
  // // reject 的值是 3
  // const prf = MyPromise.reject('reject finally').finally(() => {})
  
  // setTimeout(() => {
  //   console.log(pt, ptf, pr, prf)
  // })
}



