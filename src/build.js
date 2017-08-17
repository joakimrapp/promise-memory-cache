module.exports = ( { source, ttl, ttk, timeout, mapper = request => request, emitter, store = new Map() } ) => {
	let timeoutObject, milliseconds, max = 0, cleanup = () => {
		if( ttk && !timeoutObject )
			if( store.size && ( max = Math.max( max, store.size ) ) ) {
				const { value: [ key, { promises, timestamp } ] } = store.entries().next();
				timeoutObject = ( promises ) ? new Promise( ( resolve, reject ) => promises.add( { resolve, reject } ) )
						.catch( () => {} ).then( () => ( ( timeoutObject = undefined ), cleanup() ) ) :
					( ( milliseconds = timestamp + ttk - Date.now() ) > 0 ) ? setTimeout( () => ( ( timeoutObject = undefined ), cleanup() ), milliseconds ) :
					( emitter.emit( 'ttk', key ), store.delete( key ), process.nextTick( cleanup ), undefined );
			}
			else
				emitter.emit( 'empty', max );
	};
	const clear = () => Promise.resolve( clearTimeout( timeoutObject ), ( timeoutObject = undefined ), store.clear() );
	const purge = ( request ) => Promise.resolve( store.delete( mapper( request ) ) );
	const getItem = ( request, key = mapper( request ), item = store.get( key ) || store.set( key, { key } ).get( key ) ) => (
		( ( ( !item.timestamp ) || ( ( ttl >= 0 ) && ( Date.now() > ( item.timestamp + ttl ) ) ) ) && ( !item.promises ) ) &&
		( emitter.emit( 'source', key ), ( item.promises = new Set() ), Promise.resolve( request )
			.then( source )
			.then( response => new Promise( resolve => setImmediate( resolve, response ) ) )
			.then( response => Object.assign( item, { timestamp: Date.now(), response } ), true )
			.catch( err => item.timestamp ? ( emitter.emit( 'failed', key ), Promise.resolve( false ) ) : Promise.reject( err ) )
			.then( successful => (
				item.promises.forEach( promise => ( item.promises.delete( promise ), process.nextTick( promise.resolve, item.response ) ) ),
				delete item.promises,
				successful ) )
			.then( successful => successful && ( store.delete( key ), store.set( key, item ), cleanup() ) )
			.catch( err => (
				item.promises.forEach( promise => ( item.promises.delete( promise ), process.nextTick( promise.reject, err ) ) ),
				delete item.promises ) ) ),
		item );
	const getTimeoutPromise = ( item, promise, timeoutObject ) => Promise.race( [
		new Promise( ( resolve, reject ) => item.promises.add( ( promise = { resolve, reject } ) ) )
			.then( response => ( clearTimeout( timeoutObject ), response ) ),
		new Promise( resolve => ( timeoutObject = setTimeout( resolve, timeout, item.response ) ) )
			.then( response => ( emitter.emit( 'timeout', item.key ), item.promises && item.promises.delete( promise ), response ) ) ] );
	const getPromise = ( item ) => ( item.promises ) ? ( timeout && item.timestamp ) ? getTimeoutPromise( item ) :
		new Promise( ( resolve, reject ) => item.promises.add( { resolve, reject } ) ) :
		( emitter.emit( 'cache', item.key ), Promise.resolve( item.response ) );
	return { clear, get: request => getPromise( getItem( request ) ), purge };
};
