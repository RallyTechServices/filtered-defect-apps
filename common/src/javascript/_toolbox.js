Ext.define('RallyTechServices.filtereddefectapps.common.Toolbox',{
    singleton: true,

    fetchDefectStates: function(){
        var deferred = Ext.create('Deft.Deferred');
        Rally.data.ModelFactory.getModel({
            type: 'Defect',
            success: function (model) {
                Deft.Promise.all([
                    RallyTechServices.filtereddefectapps.common.Toolbox.fetchAllowedValues(model, 'State'),
                    RallyTechServices.filtereddefectapps.common.Toolbox.fetchAllowedValues(model, 'Priority')]).then({

                    success: function (results) {
                        deferred.resolve(results);
                    },
                    failure: function (msg) {
                        deferred.reject(msg);
                    }
                });
            }
        });
        return deferred.promise;
    },
    fetchAllowedValues: function(model, field){
        var deferred = Ext.create('Deft.Deferred');

        model.getField(field).getAllowedValueStore().load({
            callback: function(records, operation, success) {
                if (success){
                    var vals = _.map(records, function(r){ return r.get('StringValue').length === 0 ? "None" : r.get('StringValue'); });
                    deferred.resolve(vals);
                } else {
                    deferred.reject("Error fetching category data");
                }
            }
        });
        return deferred;
    }
});
