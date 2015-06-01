var paypal, paymentCreate, paymentExecute;

paypal = Npm.require('paypal-rest-sdk');

function getProductInfo(product){
    check(product, Match.OneOf(String, Object));

    var info;

    // Determine how to get the info - look up info via id in package-specific collection
    // Get info via collection query
    switch(typeof product){
        case 'string':
            // look up local collection
            info = PayPalProducts.findOne(product);
            break;
        case 'object':
            info = product;
            break;
        default:
            info = null;
    }


    return info;
}

paymentCreate = Meteor.wrapAsync(paypal.payment.create, paypal.payment);
paymentExecute = Meteor.wrapAsync(paypal.payment.execute, paypal.payment);

// TODO: Add authentication to each method
// TODO: Add multi-product support

// Payment methods
Meteor.methods({
    'paypal-create'(product){
        check(product, {
            name: String,
            sku: String,
            price: String,
            currency: String,
            quantity: String,
            amount: {
                currency: String,
                total: String
            },
            description: String
        });

        var userId = this.userId;

        var paypalPaymentInfo, info, config, result, returnUrl, cancelUrl, transaction, configId;

        configId = PayPal.configId;

        config = configId ? PayPal.config.findOne(configId) : _.extend(Meteor.settings.paypal, Meteor.settings.public.paypal);

        // Throw if there is no configuration
        if(!config){
            throw new Meteor.Error('no-config', 'Could not find a stored configuration for paypal');
        }

        paypal.configure(config);

        returnUrl = config.redirect_urls.return_url;
        cancelUrl = config.redirect_urls.cancel_url;

        if(!returnUrl || !cancelUrl){
            throw new Meteor.Error('empty-url', 'Empty return_url or cancel_url');
        }

        // Construct payment object
        paypalPaymentInfo = {
            "intent": "sale",
            "payer": {
                "payment_method": "paypal"
            },
            "redirect_urls": {
                "return_url": returnUrl,
                "cancel_url": cancelUrl
            },
            "transactions": []
        };

        // Transaction template
        // Use transactions that were passed in as an argument
        // or point to a collection that matches up with the transaction fields
        // if(transactions instanceof (Mongo.Collection || Meteor.Collection)){
        //     transaction = transactions;
        // }
        // else{
            // TODO: Support multiple products
            transaction = {
                "item_list": {
                    "items": [{
                        "name": product.name,
                        "sku": product.sku,
                        "price": product.price,
                        "currency": product.currency,
                        "quantity": product.quantity
                    }]
                },
                "amount": {
                    "currency": product.amount.currency,
                    "total": product.amount.total
                },
                "description": product.description
            };
        // };

        // Add transactions to paypalPaymentInfo

        // if(product instanceof Array){
        //     product.forEach(product => {
        //         paypalPaymentInfo.transactions.push(product);
        //     });
        // }
        // else{
            paypalPaymentInfo.transactions.push(transaction);
        // }

        // info = getProductInfo(product);

        // Test what the result is before trying to record the payment

        // Create PayPal payment
        try{
            result = paymentCreate(paypalPaymentInfo);
        }
        catch(error){
            throw new Meteor.Error(error.response);
        }


        if(result.state !== 'created'){

            // Log error
            let payment = {
                paymentId: result.id,
                provider: 'paypal',
                action: 'create',
                time: result.create_time,
                httpStatusCode: result.httpStatusCode,
                response: result,
                userId,
                // userEmail: user.emails[0].address,
                productId: product.sku,
                couponCode: couponCode || null
            };

            PaymentErrors.insert(payment);

            // Throw meteor error
            throw new Meteor.Error('paypal-payment-not-created', 'Failed to create PayPal payment');
        }


        let payment = {
            paymentId: result.id,
            productId: product.sku,
            createdAt: new Date(),
            state: 'created',
            provider: 'paypal',
            userId,
            quantity: product.quantity,
            sku: product.sku,
            productName: product.name,
            currency: product.currency,
            price: product.price,
            amount: {
                currency: product.amount.currency,
                total: product.amount.total
            },
            description: product.description
        };

        Payments.insert(payment);

        // Return 'return_url'
        return _.findWhere(result.links, { rel: 'approval_url' }).href;
    },
    'paypal-execute'(options){
        check(options, {
            paymentId: String,
            payerId: String
        });

        var paymentId, payerId, configId;

        paymentId = options.paymentId;
        payerId = options.payerId;
        configId = PayPal.configId;

        var payment, executePayment, result, config;

        payment = Payments.findOne({ provider: 'paypal', paymentId });

        // Whether we get the configuration via the collection or .json
        // it should have the same model

        // Get config
        config = configId ? PayPal.config.findOne(configId) : Meteor.settings.paypal;

        if(!config){
            throw new Meteor.Error('paypal-no-config', 'Failed to load specified paypal configuration');
        }

        // Set config
        paypal.configure(config);

        if (!payment) {
            throw new Meteor.Error('paypal-paymentNotFound');
        }

        // Block 
        if(!PayPal.validateProcessAttempt()){
            throw new Meteor.Error('paypal-failed-payment-processing');
        }

        // Process Payment
        try{
            result = paymentExecute(paymentId, { payer_id: payerId });
        }
        catch(error){
            throw new Meteor.Error(error.response);
        }

        // Update Payment state
        Payments.update(payment._id, { $set: { state: result.state, closedAt: new Date() } });
        

        if(result.state !== 'approved'){
            let errorResult = {
                paymentId: result.id,
                provider: 'paypal',
                action: 'create',
                time: result.create_time,
                httpStatusCode: result.httpStatusCode,
                response: result,
                userId,
                // userEmail: user.emails[0].address,
                productId: product.sku,
                couponCode: couponCode || null
            };

            PaymentErrors.insert(errorResult);

            // Call PayPal.onError
            PayPal.onError(errorResult);

            throw new Meteor.Error('paypal-payment-not-approved');
        }

        // Execute PayPal.onSuccess()

        // Allow users to execute other methods when done
        return true;
    }
});

// Payment configuration methods
Meteor.methods({
    'paypal-new-config'(config){
        check(config, Object);

        return PayPal.config.insert(config);
    },
    'paypal-configure'(configId, config){
        check(configId, String);
        check(config, Object);

        return PayPal.config.upsert(configId, config);
    },
    'paypal-mode'(configId, _mode){
        check(configId, String);
        check(_mode, String);

        return PayPal.config.update(configId, { $set: { mode: _mode }});
    },
    'paypal-client-id'(configId, _client_id){
        check(configId, String);
        check(_client_id, String);

        return PayPal.config.update(configId, { $set: { client_id: _client_id }});
    },
    'paypal-client-secret'(configId, _client_secret){
        check(configId, String);
        check(_client_secret, String);

        return PayPal.config.update(configId, { $set: { client_secret: _client_secret }});
    },
    'paypal-return-url'(configId, returnUrl){
        check(configId, String);
        check(returnUrl, String);

        return PayPal.config.update(configId, { $set: { 'redirect_urls.return_url': returnUrl }});
    },
    'paypal-cancel-url'(configId, cancelUrl){
        check(configId, String);
        check(cancelUrl, String);

        return PayPal.config.update(configId, { $set: { 'redirect_urls.cancel_url': cancelUrl }});
    },
});

Meteor.publish('paypal-config', function(){
    return PayPal.config.find();
});