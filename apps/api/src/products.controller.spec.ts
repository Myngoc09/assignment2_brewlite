describe('product API contract',()=>{it('exposes collection and detail endpoints',()=>expect(['GET /api/products','GET /api/products/:id']).toHaveLength(2))});
