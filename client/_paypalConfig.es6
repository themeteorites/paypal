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
    live(){
        var self = this, mode = self.mode;
        return mode === 'live' ? 'checked' : null;
    }
});


Template._paypalConfig.events({
    'click input[type=\'radio\']'(e, t){
        var self = this, configId = self._id, targetMode = e.currentTarget.value;

        // Update 
        Meteor.call('paypal-mode', configId, targetMode, result);
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

        Meteor.call(methodName, configId, targetValue, result);
    },
    'click button.paypal-set-config'(e, t){
        e.preventDefault();

        var done, button, error, reset, self = this, msg = 'Setting the configuration...';

        button = t.$('.' + e.currentTarget.className);

        console.log(msg);

        button.text(msg);
        button.prop('disabled', true);

        reset = function(){
            Meteor.setTimeout(function(){
                button.prop('enabled', true);
                button.text('Set');
            }, 2000);
        };

        done = function(){
            let msg = 'Set configuration successfully!';
            button.text(msg);
            button.prop('disabled', true);
            console.log(msg);
        };

        error = function(err){
            button.text('Failed to set configuration');

            button.prop('disabled', true);
            errorCB(err.message);
            reset();
        };

        PayPal.setConfigById(self._id).then(done).catch(error);
    }
});