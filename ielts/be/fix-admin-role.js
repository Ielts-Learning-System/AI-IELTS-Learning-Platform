const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const col = mongoose.connection.collection('users');
    const r = await col.updateOne(
      { email: 'tranvinhhuy@gmail.com' },
      { $set: { role: 'Admin' } }
    );
    const u = await col.findOne({ email: 'tranvinhhuy@gmail.com' }, { projection: { role: 1 } });
    console.log('modified=' + r.modifiedCount + ' newRole=' + u.role);
    process.exit(0);
  })
  .catch(e => { console.error(e.message); process.exit(1); });
