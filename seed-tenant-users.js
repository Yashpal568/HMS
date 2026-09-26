const mongoose = require('E:/FluBird/node_modules/.pnpm/mongoose@9.9.5/node_modules/mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://yash38688_db_user:pqHzp1jr9SeUUIvW@cluster0.u0fr4ag.mongodb.net/hms_dev?retryWrites=true&w=majority&appName=Cluster0');
  const tenantId = new mongoose.Types.ObjectId('6aa3f64974f6740b10b10001');

  const res = await mongoose.connection.collection('users').updateMany(
    { email: { $in: ['dr.sharma@hms.local', 'opd.staff@hms.local', 'billing.staff@hms.local', 'pharmacy.staff@hms.local', 'lab.staff@hms.local', 'admin@hms.local', 'test.doctor.live@hms.local'] } },
    { $set: { hospitalId: tenantId, tenantId: tenantId } }
  );
  console.log('Updated users:', res.modifiedCount);

  // Check doctors
  const docs = await mongoose.connection.collection('doctors').find({ tenantId }).toArray();
  console.log('Doctors count:', docs.length);
  if (docs.length === 0) {
    const docUser = await mongoose.connection.collection('users').findOne({ email: 'dr.sharma@hms.local' });
    const newDoc = await mongoose.connection.collection('doctors').insertOne({
      userId: docUser._id,
      tenantId: tenantId,
      hospitalId: tenantId,
      firstName: 'Rajesh',
      lastName: 'Sharma',
      specialty: 'General Medicine',
      department: 'General Medicine',
      consultationFee: 500,
      opdRoomNumber: 'OPD-101',
      isActive: true,
      availableDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('Created doctor:', newDoc.insertedId);
  }

  // Ensure patients
  const pts = await mongoose.connection.collection('patients').find({ tenantId }).toArray();
  console.log('Patients count for tenant:', pts.length);
  if (pts.length === 0) {
    await mongoose.connection.collection('patients').insertMany([
      {
        uhid: 'UHID-2026-000001',
        tenantId: tenantId,
        hospitalId: tenantId,
        firstName: 'Rohan',
        lastName: 'Verma',
        gender: 'MALE',
        dateOfBirth: new Date('1992-05-14'),
        phone: '+91 9876543210',
        email: 'rohan.verma@example.com',
        bloodGroup: 'O_POSITIVE',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        uhid: 'UHID-2026-000002',
        tenantId: tenantId,
        hospitalId: tenantId,
        firstName: 'Priya',
        lastName: 'Sharma',
        gender: 'FEMALE',
        dateOfBirth: new Date('1995-08-22'),
        phone: '+91 9876543211',
        email: 'priya.sharma@example.com',
        bloodGroup: 'B_POSITIVE',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
    console.log('Inserted sample patients for tenant');
  }

  await mongoose.disconnect();
}

run().catch(console.error);
