module.exports = ( source ) => {
	const context = { source, emitter: new ( require( 'events' ) ).EventEmitter() };
	const pub = {
		on: ( ...args ) => ( ( context.emitter.on( ...args ) ), pub ),
		ttl: ( value ) => ( ( context.ttl = value ), pub ),
		ttk: ( value ) => ( ( context.ttk = value ), pub ),
		timeout: ( value ) => ( ( context.timeout = value ), pub ),
		mapper: ( value ) => ( ( context.mapper = value ), pub ),
		build: () => require( './build.js' )( context )
	};
	return pub;
};
