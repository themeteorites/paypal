PayPal = {};

PayPal.config = new Mongo.Collection('paypal_config');

PayPal.config.attachSchema(new SimpleSchema({
    mode: {
        type: String,
        allowedValues: ['sandbox', 'live']
    },
    client_id: {
        type: String,
        label: 'Client Id'
    },
    client_secret: {
        type: String,
        label: 'Client Secret'

    },
    'redirect_urls.return_url': {
        type: String,
        optional: true
    },
    'redirect_urls.cancel_url': {
        type: String,
        optional: true
    }
}));

// David Morales on SO - http://stackoverflow.com/a/11582513
getURLParameter = function(name){
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
};

function cb(e, r){
    console.log(e || r);
}

if(Meteor.isClient){
    // User Defined Function
    // PayPal.configure = function(configId){
    //     // console.log(self.configure);
    //     Meteor.call('paypal-configure', self.configure, cb);
    // };

    PayPal.create = function(product){
        return new Promise(function(resolve, reject){
            if(!product){ return reject(Error('paypal-product', 'Please provide product info')); }

            Meteor.call('paypal-create', product, function(error, result){
                if(error){
                    return reject(error);
                }
                else{
                    return resolve(result);
                }
            });
        });
    };

    PayPal.execute = function(paymentId = getURLParameter('paymentId'), payerId = getURLParameter('PayerID')){
        var self = this;

        return new Promise(function(resolve, reject){
            if(!payerId){ return reject(new Error('payer-id-not-found', 'Failed to retrieve payerId')); }
            if(!paymentId){ return reject(new Error('no-payment-id', 'Please provide a paymentId')); }

            Meteor.call('paypal-execute', { paymentId, payerId }, function(error, result){
                if(error){
                    return reject(error);
                }
                else{
                    return resolve(result);
                }
            });
        });
    };
}

if(Meteor.isServer){
    // User Defined function
    // PayPal.validateProcessAttempt = function(){
    //     // TODO: Decide what argument(s) to pass in

    //     // return a falsy or truthy value
    // };


    PayPal._onSuccess = function(){
        console.log('Do something after payment succeeds');
    };

    PayPal._onError = function(){
        console.log('Do something after payment fails');
    };
}