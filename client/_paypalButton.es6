function goTo(url){

    // Go to approval_url
    return window.location.href = url;
}

Template._paypalButton.events({
    'click button.paypal-button': function(event, template){
        var button, cachedMsg, error, self = this, msg = 'loading...', className = event.currentTarget.className;

        button = template.$('.' + className);

        cachedMsg = button.text();

        button.text(msg);

        var product = {
            name: self.name,
            sku: self.sku,
            price: self.price,
            currency: self.currency,
            quantity: self.quantity,
            amount: {
                currency: self.amount.currency,
                total: self.amount.total
            },
            description: self.description
        };

        console.group('Product');
        console.dir(product);
        console.groupEnd();

        error = function(){
            button.text(cachedMsg);
            errorCB
        };

        PayPal.create(product).then(goTo).catch(error);
    }
});