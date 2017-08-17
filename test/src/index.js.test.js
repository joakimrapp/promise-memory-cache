require( '@jrapp/node-project-setup' ).testing.file( './test' )( ( index ) => ( {
	waterfall: jobs => jobs.reduce( ( promise, job ) => promise.then( job ), Promise.resolve() )
} ) )
	.describe( 'basic' )
		.it( 'should not get from cache on different requests', ( assert, index, { waterfall } ) => {
			let count = 0;
			const cache = index( (  ) => ++count ).build();
			return waterfall( [
				() => cache.get( 1 ),
				() => cache.get( 2 ),
				() => cache.clear()
			] ).then( () => assert.equal( count, 2 ) );
		} )
		.it( 'should get from cache on same requests', ( assert, index, { waterfall } ) => {
			let count = 0;
			const cache = index( (  ) => ++count ).build();
			return waterfall( [
				() => cache.get( 1 ),
				() => cache.get( 1 ),
				() => cache.clear()
			] ).then( () => assert.equal( count, 1 ) );
		} )
		.it( 'should reject if not cached and source rejects', ( assert, index, { waterfall } ) => new Promise( resolve => {
			index( () => Promise.reject() ).build().get().catch( resolve );
		} ) )
		.it( 'should get from cache if source rejects and cached value exists', ( assert, index, { waterfall } ) => {
			let count = 1;
			const cache = index( ( ok ) => ok ? Promise.resolve( count ) : Promise.reject( ++count ) ).ttl( 1 ).mapper( () => '' ).build();
			return waterfall( [
				() => cache.get( true ).then( value => assert.equal( value, 1 ) ),
				() => new Promise( resolve => setTimeout( resolve, 20 ) ),
				() => cache.get( false ).then( value => assert.equal( value, 1 ) ),
				() => cache.get( true ).then( value => assert.equal( value, 2 ) ),
				() => cache.clear()
			] );
		} )
	.done()
	.describe( 'refresh' )
		.it( 'should refresh', ( assert, index, { waterfall } ) => {
			let count = 0;
			const cache = index( () => ++count ).build();
			return waterfall( [
				() => cache.get( 1 ),
				() => cache.get( 1 ),
				() => cache.refresh( 1 ),
				() => cache.get( 1 ),
				() => cache.clear()
			] ).then( () => assert.equal( count, 2 ) );
		} )
	.done()
	.describe( 'ttl' )
		.it( 'should not get from cache if stale item', ( assert, index, { waterfall } ) => {
			let count = 0;
			const cache = index( () => ++count ).ttl( 10 ).build();
			return waterfall( [
				() => cache.get( 1 ),
				() => new Promise( resolve => setTimeout( resolve, 20 ) ),
				() => cache.get( 1 ),
				() => cache.clear()
			] ).then( () => assert.equal( count, 2 ) );
		} )
		.it( 'should get from cache if not stale item', ( assert, index, { waterfall } ) => {
			let count = 0;
			const cache = index( (  ) => ++count ).ttl( 40 ).build();
			return waterfall( [
				() => cache.get( 1 ),
				() => new Promise( resolve => setTimeout( resolve, 20 ) ),
				() => cache.get( 1 ),
				() => cache.clear()
			] ).then( () => assert.equal( count, 1 ) );
		} )
	.done()
	.describe( 'timeout' )
		.it( 'should not get from cache if not timed out', ( assert, index, { waterfall } ) => {
			let count = 0;
			const cache = index( () => new Promise( resolve => setTimeout( resolve, 10, ++count ) ) ).ttl( 1 ).timeout( 10000 ).build();
			return waterfall( [
				() => cache.get( 1 ).then( value => assert.equal( value, 1 ) ),
				() => new Promise( resolve => setTimeout( resolve, 20 ) ),
				() => cache.get( 1 ).then( value => assert.equal( value, 2 ) ),
				() => cache.clear()
			] );
		} )
		.it( 'should get from cache if timed out', ( assert, index, { waterfall } ) => {
			let count = 0;
			const cache = index( () => new Promise( resolve => setTimeout( resolve, 30, ++count ) ) ).ttl( 0 ).timeout( 20 ).build();
			return waterfall( [
				() => cache.get( 1 ).then( value => assert.equal( value, 1 ) ),
				() => cache.get( 1 ).then( value => assert.equal( value, 1 ) ),
				() => cache.clear()
			] );
		} )
	.done()
	.describe( 'ttk' )
		.it( 'should get from cache if timed out and not evicted', ( assert, index, { waterfall } ) => {
			let count = 0;
			const cache = index( () => new Promise( resolve => setTimeout( resolve, 30, ++count ) ) ).ttl( 0 ).ttk( 40 ).timeout( 20 ).build();
			return waterfall( [
				() => cache.get( 1 ).then( value => assert.equal( value, 1 ) ),
				() => cache.get( 1 ).then( value => assert.equal( value, 1 ) ),
				() => cache.clear()
			] );
		} )
		.it( 'should not get from cache if timed out and evicted', ( assert, index, { waterfall } ) => {
			let count = 0;
			const cache = index( () => new Promise( resolve => setTimeout( resolve, 30, ++count ) ) ).ttl( 0 ).ttk( 10 ).timeout( 20 ).build();
			return waterfall( [
				() => cache.get( 1 ).then( value => assert.equal( value, 1 ) ),
				() => new Promise( resolve => setTimeout( resolve, 20 ) ),
				() => cache.get( 1 ).then( value => assert.equal( value, 2 ) ),
				() => cache.clear()
			] );
		} )
		.it( 'should clean up after request is processed', ( assert, index, {} ) => new Promise( resolve => {
			const cache = index( ( ms ) => new Promise( resolve => setTimeout( resolve, ms ) ) ).ttk( 10 )
				.on( 'empty', resolve ).build();
			cache.get( 50 );
			cache.get( 2 );
		} ) )
	.done()
	.describe( 'purge' )
		.it( 'should not get from cache if purged', ( assert, index, { waterfall } ) => {
			let count = 0;
			const cache = index( () => ++count ).build();
			return waterfall( [
				() => cache.get( 1 ),
				() => cache.get( 1 ),
				() => cache.purge( 1 ),
				() => cache.get( 1 ),
				() => cache.clear()
			] ).then( () => assert.equal( count, 2 ) );
		} )
	.done()
.done();
