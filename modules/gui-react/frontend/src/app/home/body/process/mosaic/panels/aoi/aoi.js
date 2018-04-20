import PropTypes from 'prop-types'
import React from 'react'
import {Msg, msg} from 'translate'
import {Constraints, ErrorMessage, form, Input} from 'widget/form'
import {RecipeActions, RecipeState} from '../../mosaicRecipe'
import ConfirmationButtons from '../confirmationButtons'
import styles from './aoi.module.css'

const inputs = {
    country: new Constraints()
        .notBlank('process.mosaic.panel.areaOfInterest.form.country.required'),
}

const mapStateToProps = (state, ownProps) => {
    const recipe = RecipeState(ownProps.id)
    return {
        values: recipe('aoi')
    }
}

class Aoi extends React.Component {
    constructor(props) {
        super(props)
        this.recipe = RecipeActions(props.id)
    }
    render() {
        const {className, form, inputs: {country}} = this.props
        return (
            <div className={className}>
                <div className={styles.container}>
                    <div>
                        <Msg id={'process.mosaic.panel.areaOfInterest.title'}/>
                    </div>
                    <form>
                        <div>
                            <label><Msg id='process.mosaic.panel.areaOfInterest.form.country.label'/></label>
                            <Input
                                input={country}
                                placeholder={msg('process.mosaic.panel.areaOfInterest.form.country.placeholder')}
                                autoFocus='on'
                                autoComplete='off'
                                tabIndex={1}/>
                            <ErrorMessage input={country}/>
                        </div>
                        <ConfirmationButtons form={form} recipe={this.recipe}/>
                    </form>
                </div>
            </div>
        )
    }
}

Aoi.propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    form: PropTypes.object,
    inputs: PropTypes.shape({
        country: PropTypes.object,
    }),
    action: PropTypes.func,
    values: PropTypes.object
}

export default form(inputs, mapStateToProps)(Aoi)