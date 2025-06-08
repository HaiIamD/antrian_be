const User = require('../Schema/userAuth');
const LocketData = require('../Schema/Queue');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const loginUser = async (req, res) => {
  try {
    const { userName, password } = req.body;
    const findUsername = await User.findOne({ userName: userName });
    if (!findUsername) return res.status(404).json({ error: 'Username Tidak Ditemukan' });

    const matchingPassword = await bcrypt.compare(password, findUsername.password);
    if (!matchingPassword) return res.status(404).json({ error: 'Password salah, silahkan coba lagi' });

    const Token = jwt.sign({ id: findUsername._id }, process.env.JWT_SECRET);

    res.status(200).json({
      token: Token,
      user: {
        _id: findUsername._id,
        userName: findUsername.userName,
        locket: findUsername.locket,
        role: findUsername.role,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Ada kesalahan pada server, silahkan coba lagi' });
  }
};

const registerUser = async (req, res) => {
  try {
    const { userName, password, role, locket } = req.body;

    if (!role) {
      role = 'staff';
    }
    const verifyUserName = await User.findOne({ userName: userName });

    if (verifyUserName) return res.status(409).json({ error: 'Username telah digunakan, silahkan gunakan username lain' });

    if (password.length <= 4) return res.status(404).json({ error: 'Minimal Password 4 Character' });

    const salt = await bcrypt.genSalt();
    const encryption = await bcrypt.hash(password, salt);

    const newUser = new User({
      userName,
      password: encryption,
      role,
      locket,
    });

    const saveUser = await newUser.save();
    if (!saveUser) res.status(404).json({ error: 'Registrasi gagal, silahkan coba lagi' });

    const findLocketData = await LocketData.findOne({ locket: locket });

    if (!findLocketData) {
      const newQueue = new LocketData({
        locket: locket,
      });
      await newQueue.save();
    } else {
    }

    res.status(201).json({
      message: 'Registrasi Berhasil',
      user: {
        _id: saveUser._id,
        userName: saveUser.userName,
        locket: saveUser.locket,
        role: saveUser.role,
        createdAt: saveUser.createdAt,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Ada kesalahan pada server, silahkan coba lagi' });
  }
};

const getAllUser = async (req, res) => {
  try {
    const users = await User.find({}).select('_id userName locket role createdAt');
    res.status(200).json(users);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Ada kesalahan pada server, silahkan coba lagi' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { userName, password, role, locket } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'ID pengguna diperlukan untuk pembaruan.' });
    }
    const userToUpdate = await User.findById(id);

    if (!userToUpdate) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }

    if (userName) {
      userToUpdate.userName = userName;
    }
    if (role) {
      userToUpdate.role = role;
    }
    if (locket) {
      userToUpdate.locket = locket;
    }

    if (password) {
      if (password.length <= 4) return res.status(404).json({ error: 'Minimal Password 4 Character' });
      const salt = await bcrypt.genSalt();
      userToUpdate.password = await bcrypt.hash(password, salt);
    }

    await userToUpdate.save();

    const findLocketData = await LocketData.findOne({ locket: locket });

    if (!findLocketData) {
      const newQueue = new LocketData({
        locket: locket,
      });
      await newQueue.save();
    } else {
    }

    res.status(200).json({
      message: 'Data pengguna berhasil diperbarui',
      user: {
        _id: userToUpdate._id,
        userName: userToUpdate.userName,
        locket: userToUpdate.locket,
        role: userToUpdate.role,
        createdAt: userToUpdate.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Ada kesalahan pada server, silahkan coba lagi' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'ID pengguna diperlukan untuk menghapus user.' });
    }
    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }
    res.status(200).json({ message: 'Pengguna berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ error: 'Ada kesalahan pada server, silahkan coba lagi' });
  }
};

module.exports = { loginUser, registerUser, getAllUser, updateUser, deleteUser };
