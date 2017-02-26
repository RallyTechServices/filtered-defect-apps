Ext.override(Rally.ui.picker.MilestonePicker, {
    initEvents: function () {
        this.callParent(arguments);
        this.on('afterrender', this._onAfterRender, this, {single: true});
        this.on('afteralignpicker', this._selectCheckboxes, this);
        this.on('expand', this._onInitialExpand, this, {single: true});
        this._initInputEvents();
        this._autoExpand();


        if (!this.rendered){
            this.on('afterrender', this.createStore, this, {single: true});
        } else {
            this.createStore();
        }
    }
});

Ext.override(Rally.ui.combobox.FieldValueComboBox, {
    _loadStoreValues: function() {
        this.field.getAllowedValueStore({context: this.context && _.isFunction(this.context.getDataContext) ? this.context.getDataContext() : this.context}).load({
            requester: this,
            callback: function(records, operation, success) {
                var store = this.store;
                if (!store) {
                    return;
                }
                var values = [],
                    labelValues = _.map(
                        _.filter(records, this._hasStringValue),
                        this._convertAllowedValueToLabelValuePair,
                        this
                    );

                if(this.field.getType() === 'boolean') {
                    labelValues = labelValues.concat([
                        this._convertToLabelValuePair('Yes', true),
                        this._convertToLabelValuePair('No', false)
                    ]);
                } else if (this.field.required === false) {
                    var name = "-- No Entry --",
                        value = this.noEntryValue;
                    if (this.getUseNullForNoEntryValue()) {
                        this.noEntryValue = value = null;
                    }
                    if (this.field.attributeDefinition.AttributeType.toLowerCase() === 'rating') {
                        name = this.getRatingNoEntryString();
                        value = "None";
                    }
                    values.push(this._convertToLabelValuePair(name, value));
                }

                if (this.getAllowInitialValue() && this.config.value) {
                    var initialValue = this.transformOriginalValue(this.config.value);
                    if (this._valueNotInAllowedValues(initialValue, labelValues)) {
                        var label = this.config.value._refObjectName || initialValue;
                        values.push(this._convertToLabelValuePair(label, initialValue));
                    }
                }

                store.loadRawData(values.concat(labelValues));
                store.fireEvent('load', store, store.getRange(), success);
            },
            scope: this
        });
    },
});