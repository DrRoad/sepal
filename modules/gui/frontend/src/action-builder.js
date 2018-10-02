import {dispatch} from 'store'
import {toPathList} from 'collections'
import _ from 'lodash'
import immutable from 'object-path-immutable'

export default function actionBuilder(type, props) {
    const operations = []
    const sideEffects = []
    let prefix = ''

    return {
        within(_prefix) {
            prefix = _prefix
            return this
        },
        
        withState(path, callback) {
            operations.push(immutableState => {
                const currentState = immutableState.value()
                const selectedState = select(path, currentState)
                return callback(selectedState, immutable(currentState))
            })
            return this
        },

        set(path, value) {
            operations.push((immutableState, state) => {
                const pathList = toPathList(path)
                const prevValue = select(pathList, state)
                if (prevValue !== value)
                    return immutableState.set(pathList, value)
            })
            return this
        },

        setValueByTemplate(path, template, value) {
            path = toPathList(path)
            operations.push((immutableState, state) => {
                const index = select(path, state)
                    .findIndex(value => _.isEqual(template, _.pick(value, _.keys(template))))
                return (index !== -1)
                    ? immutableState.set([...path, index], value)
                    : immutableState
            })
            return this
        },

        assign(path, value) {
            operations.push(immutableState => immutableState.assign(toPathList(path), value))
            return this
        },

        assignValueByTemplate(path, template, value) {
            path = toPathList(path)
            operations.push((immutableState, state) => {
                const index = select(path, state)
                    .findIndex(value => _.isEqual(template, _.pick(value, _.keys(template))))
                return (index !== -1)
                    ? immutableState.assign([...path, index], value)
                    : immutableState
            })
            return this
        },

        setAll(values) {
            Object.keys(values).forEach((path) =>
                this.set(path, values[path]))
            return this
        },

        map(path, callback) {
            operations.push((immutableState, state) => {
                const collection = select(path, state)
                if (!Array.isArray(collection)) return immutableState
                return collection
                    .map(callback)
                    .map((value, index) => ({index, value}))
                    .filter(({index, value}) => value !== collection[index])
                    .reduce((immutableState, {index, value}) => immutableState.set([path, index], value), immutableState)
            })
            return this
        },

        push(path, value) {
            operations.push(immutableState => {
                return immutableState.push(toPathList(path), value)
            })
            return this
        },

        sideEffect(callback) {
            sideEffects.push(callback)
            return this
        },

        pushIfMissing(path, value, uniqueKeyProp) {
            operations.push((immutableState, state) => {
                const collection = select(path, state)
                const equals = (item) => uniqueKeyProp
                    ? item[uniqueKeyProp] === value[uniqueKeyProp]
                    : item === value

                if (collection && collection.find(equals))
                    return immutableState
                else
                    return immutableState.push(toPathList(path), value)
            })
            return this
        },

        del(path) {
            operations.push(immutableState => immutableState.del(toPathList(path)))
            return this
        },

        delValue(path, value) {
            path = toPathList(path)
            operations.push((immutableState, state) => {
                const index = select(path, state).indexOf(value)
                return (index !== -1)
                    ? immutableState.del([...path, index])
                    : immutableState
            })
            return this
        },

        delValueByTemplate(path, template) {
            path = toPathList(path)
            operations.push((immutableState, state) => {
                const index = select(path, state)
                    .findIndex(value => _.isEqual(template, _.pick(value, _.keys(template))))
                return (index !== -1)
                    ? immutableState.del([...path, index])
                    : immutableState
            })
            return this
        },

        build() {
            const performOperation = (immutableState, operation) => {
                const state = immutableState.value()
                return operation(immutable(state), state) || immutableState
            }
            return {
                type,
                ...props,
                reduce(state) {
                    if (!prefix) {
                        var nextState = operations.reduce(
                            performOperation,
                            immutable(state)
                        ).value()
                        sideEffects.forEach(sideEffect => sideEffect(nextState))
                        return nextState
                    } else {
                        const subState = operations.reduce(
                            performOperation,
                            immutable(select(prefix, state))
                        ).value()
                        sideEffects.forEach(sideEffect => sideEffect(subState))
                        return immutable(state).set(prefix, subState).value()
                    }
                },
                dispatch() {
                    dispatch(this)
                }
            }
        },

        dispatch() {
            dispatch(this.build())
        }
    }
}

function select(path, state) {
    return toPathList(path).reduce((state, part) => {
        return state != null && state[part] != null ? state[part] : undefined
    }, state)
}