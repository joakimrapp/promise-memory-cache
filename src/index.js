const cleanup = ( context ) => {
	if( context.ttk && !context.timeoutObject && context.store.size ) {
		const { value: [ key, { promises, timestamp } ] } = context.store.entries().next();
		const milliseconds = timestamp + context.ttk - Date.now();
		if( promises )
			context.timeoutObject = new Promise( ( resolve, reject ) => promises.add( { resolve, reject } ) )
				.catch( () => {} )
				.then( () => ( ( context.timeoutObject = undefined ), cleanup( context ) ) );
		else if( milliseconds > 0 )
			context.timeoutObject = setTimeout( context => (
				( context.timeoutObject = undefined ), cleanup( context ) ),
			milliseconds,
			context );
		else {
			context.store.delete( key );
			cleanup( context );
		}
	}
};
const getItem = ( context, request ) => {
	const { ttl, mapper, store } = context;
	const key = mapper ? mapper( request ) : request;
	const item = store.get( key ) || store.set( key, {} ).get( key );
	if( ( ( !item.timestamp ) || ( ( ttl >= 0 ) && ( Date.now() > ( item.timestamp + ttl ) ) ) ) && ( !item.promises ) ) {
		item.promises = new Set();
		Promise.resolve( request )
			.then( context.source )
			.then( response => new Promise( resolve => setImmediate( resolve, response ) ) )
			.then( response => Object.assign( item, { timestamp: Date.now(), response } ), true )
			.catch( err => item.timestamp ? Promise.resolve( false ) : Promise.reject( err ) )
			.then( successful => (
				item.promises.forEach( promise => ( item.promises.delete( promise ), process.nextTick( promise.resolve, item.response ) ) ),
				delete item.promises,
				successful ) )
			.then( successful => successful && ( store.delete( key ), store.set( key, item ), cleanup( context ) ) )
			.catch( err => (
				item.promises.forEach( promise => ( item.promises.delete( promise ), process.nextTick( promise.reject, err ) ) ),
				delete item.promises ) );
	}
	return item;
};
const get = ( context, request ) => {
	const item = getItem( context, request );
	if( item.promises )
		if( context.timeout && item.timestamp ) {
			let promise, timeoutObject;
			return Promise.race( [
				new Promise( ( resolve, reject ) => item.promises.add( ( promise = { resolve, reject } ) ) ),
				new Promise( resolve => ( timeoutObject = setTimeout( resolve, context.timeout, item.response ) ) )
			] )
				.then( response => ( item.promises && item.promises.delete( promise ), clearTimeout( timeoutObject ), response ) );
		}
		else
			return new Promise( ( resolve, reject ) => item.promises.add( { resolve, reject } ) );
	else
		return Promise.resolve( item.response );
};
const contexts = new WeakMap();
class Cache {
	constructor( source ) { contexts.set( this, { source, store: new Map() } ); }
	ttl( value ) { return ( contexts.get( this ).ttl = value ), this; }
	ttk( value ) { return ( contexts.get( this ).ttk = value ), this; }
	timeout( value ) { return ( contexts.get( this ).timeout = value ), this; }
	mapper( value ) { return ( contexts.get( this ).mapper = value ), this; }
	destroy() { clearTimeout( contexts.get( this ).timeoutObject ); }
	get get() {
		const context = contexts.get( this );
		return ( request ) => get( contexts.get( this ), request );
	}
};
module.exports = ( source ) => new Cache( source );
