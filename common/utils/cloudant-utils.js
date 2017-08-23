'use strict'

var moment = require('moment')

var Cloudant = require('cloudant')
var cloudant = Cloudant({ account: process.env.CLOUDANT_USERNAME, password: process.env.CLOUDANT_PASSWORD })

var CloudantUtils = function () {}

CloudantUtils.prototype.init = function (dbName) {
  this.cloudantDB = cloudant.db.use(dbName)
  this.deleteBeforeResponse = {
    delete_count: 0
  }
}

CloudantUtils.prototype.listByView = function (design, view, limit, skip, params) {
  return new Promise((resolve, reject) => {
    try {
      if (!params) {
        params = {
          reduce: false,
          descending: true,
          include_docs: true,
          limit: !limit ? 10 : limit,
          skip: !skip ? 0 : skip
        }
      }
      this.cloudantDB.view(design, view, params, (err, result) => {
        if (err) return reject(err)
        // Map the results to the response for the client
        let response = {
          total: result.total_rows,
          data: []
        }
        for (let row of result.rows) {
          response.data.push(row.doc)
        }
        resolve(response)
      })
    } catch (err) {
      reject(err)
    }
  })
}

CloudantUtils.prototype.deleteBefore = function (before, design, view, skip) {
  return new Promise((resolve, reject) => {
    try {
      let params = {
        reduce: false,
        include_docs: true,
        endkey: [before.year(), before.month(), before.date()],
        limit: 25,
        skip: skip
      }
      this.cloudantDB.view(design, view, params, (err, result) => {
        if (err) return reject(err)
        if (result.rows.length > 0) {
          let bulkDelete = {
            docs: []
          }
          for (let row of result.rows) {
            let dt = moment(row.doc.post_date, 'YYYY-MM-DD')
            if (dt.isBefore(before)) {
              bulkDelete.docs.push({ _id: row.doc._id, _rev: row.doc._rev, _deleted: true })
            }
          }
          this.bulk(bulkDelete).then((result) => {
            this.deleteBeforeResponse.delete_count += result.length
            if (result.length > 24) {
              setTimeout(() => {
                this.deleteBefore(before, design, view, 0).then((success) => {
                  resolve(this.deleteBeforeResponse)
                })
              }, 500)
            } else {
              resolve(this.deleteBeforeResponse)
            }
          }).catch((err) => {
            reject(err)
          })
        } else {
          resolve(this.deleteBeforeResponse)
        }
      })
    } catch (err) {
      reject(err)
    }
  })
}

CloudantUtils.prototype.bulk = function (bulkRequest) {
  return new Promise((resolve, reject) => {
    this.cloudantDB.bulk(bulkRequest, (err, success) => {
      if (err) return reject(err)
      resolve(success)
    })
  })
}

module.exports = new CloudantUtils()
