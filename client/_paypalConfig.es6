function cb(e, r){
    console.log(e || r);
}

Template._paypalConfig.onCreated(function(){
    this.subscribe('paypal-config');
});

Template._paypalConfig.helpers({
    config(){
        if(!Template.instance().subscriptionsReady()){ return PayPal.config.find(); }

        return PayPal.config.find();
    },
    sandbox(){
        var self = this, mode = self.mode;
        return mode === 'sandbox' ? 'checked' : null;
    },
    live(mode){
        var self = this, mode = self.mode;
        return mode === 'live' ? 'checked' : null;
    }
});


Template._paypalConfig.events({
    'click input[type=\'radio\']'(e, t){
        var self = this, configId = self._id, targetMode = e.currentTarget.value;

        // Update 
        Meteor.call('paypal-mode', configId, targetMode, cb);
    },
    'change input[type=\'text\']'(e, t){
        var self = this, methodName, configId = self._id, fieldType = e.currentTarget.name, targetValue = e.currentTarget.value;

        // Update client_id or client_secret
        switch(fieldType){
            case 'client-id':
                methodName = 'paypal-client-id';
                break;
            case 'client-secret':
                methodName = 'paypal-client-secret';
                break;
            case 'return-url':
                methodName = 'paypal-return-url';
                break;
            case 'cancel-url':
                methodName = 'paypal-cancel-url';
                break;
            default:
                methodName = 'paypal-client-id'
        }

        Meteor.call(methodName, configId, targetValue, cb);
    }
});