const job = require('root/worker/job')

const worker$ = () => {
    const {EMPTY} = require('rxjs')
    const {switchMapTo} = require('rxjs/operators')
    const ee = require('@google/earthengine')
    const {ee$} = require('root/ee/utils')
    require('./extensions')

    return ee$('initalize', (resolve, reject) =>
        ee.initialize(
            null,
            null,
            () => resolve(),
            error => reject(error)
        )
    ).pipe(
        switchMapTo(EMPTY)
    )
}

module.exports = job({
    jobName: 'EE Initialization',
    before: [require('./authenticate')],
    worker$
})
