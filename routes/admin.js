// routes/admin.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

router.use(cookieParser());

// Middleware to parse form data
router.use(bodyParser.urlencoded({ extended: true }));
router.use(express.json());  // Parses JSON request body

router.get('/', async (req, res) => {
    const isAuthenticated = await checkAuthentication(req);
    console.log(isAuthenticated);
    console.log(req.path);
    if (isAuthenticated) {
        const totalLoans = await getloans();
        const totalBorrowers = await getborrowers();

        const analytics = {
            loans: totalLoans,
            borrowers: totalBorrowers,
        }

        res.render('admin/dashboard', {data: isAuthenticated, path: req.path, analytics: analytics});
    } else {
        res.redirect('/user'); // or render a login page
    }
});

router.get('/borrowers', async (req, res) => {
    const isAuthenticated = await checkAuthentication(req);

    // console.log(isAuthenticated);
    // console.log(req.path);
    if (isAuthenticated) {
        const borrowers = await getborrowers();
        res.render('admin/borrowers', {data: isAuthenticated, path: req.path, borrowers: borrowers});
    } else {
        res.redirect('/user'); // or render a login page
    }
});

router.post('/addBorrower', async (req, res) => {
    console.log(req.body);

    try {
        const isAuthenticated = await checkAuthentication(req);

        if (isAuthenticated) {
            const { firstname, lastname, contact, age, bday, sex, contact_person, SourceIncome, address, id } = req.body;

                if (id) {
                    // If an ID is provided, update the existing borrower
                    const [updateResult] = await pool.promise().execute(
                        'UPDATE borrowers SET first_name = ?, last_name = ?, phone_number = ?, age = ?, birthday = ?, sex = ?, address = ?, contact_person = ?, source_of_income = ? WHERE borrower_id = ?',
                        [firstname, lastname, contact, age, bday, sex, address, contact_person, SourceIncome, id]
                    );

                    res.status(200).json({ message: 'Borrower updated successfully!', result: updateResult });
                } else {
                // No ID provided, insert a new borrower
                const [insertResult] = await pool.promise().execute(
                    'INSERT INTO borrowers (first_name, last_name, phone_number, age, birthday, sex, address, contact_person, source_of_income) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [firstname, lastname, contact, age, bday, sex, address, contact_person, SourceIncome]
                );

                res.status(200).json({ message: 'Borrower added successfully!', result: insertResult });
            }
        } else {
            res.redirect('/user');
        }
    } catch (error) {
        console.error('Error adding/updating borrower:', error);
        res.status(500).json({ message: 'An error occurred while processing the borrower.', error: error.message });
    }
});

router.post('/deleteBorrower', async (req, res) => {
    console.log(req.body.id);
    try {
        const isAuthenticated = await checkAuthentication(req);

        if (!isAuthenticated) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ message: 'Borrower ID is required' });
        }

        const [result] = await pool.promise().execute(
            'DELETE FROM borrowers WHERE borrower_id = ?',
            [id]
        );

        res.status(200).json({ message: 'Borrower deleted successfully!', result });
    } catch (error) {
        console.error('Error deleting borrower:', error);
        res.status(500).json({ message: 'An error occurred while deleting the borrower.', error: error.message });
    }
});

router.post('/addLoan', async (req, res) => {
    console.log(req.body);

    try {
        const isAuthenticated = await checkAuthentication(req);

        if (isAuthenticated) {
            const { loanID, borrowerid, FullName, loanamount, term, interest, remaining, monthly, total, due_date, end_due_date, status } = req.body;
            console.log(req.body);

            if (loanID) {
                // Update existing loan in the database
                const [updateResult] = await pool.promise().execute(
                    'UPDATE loans SET borrower_id = ?, full_name = ?, amount = ?, remaining = ?, term = ?, monthly = ?, total = ?, interest = ?, due_date = ?, end_due_date = ?, status = ? WHERE id = ?', 
                    [borrowerid, FullName, loanamount, remaining, term, monthly, total, interest, due_date, end_due_date, status, loanID]
                );

                res.status(200).json({ message: 'Loan updated successfully!', result: updateResult });

            } else {
                // Insert into the database
                const [insertResult] = await pool.promise().execute(
                    'INSERT INTO loans (borrower_id, full_name, amount, term, monthly, total, interest, due_date, end_due_date, status, remaining) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
                    [borrowerid, FullName, loanamount, term, monthly, total, interest, due_date, end_due_date, "Pending", total]
                );

                res.status(200).json({ message: 'Loan added successfully!', result: insertResult });
            }

        } else {
            // If not authenticated, redirect to the login page
            res.redirect('/user');
        }
    } catch (error) {
        // Handle any errors
        console.error('Error adding borrower:', error);

        // Send a response indicating something went wrong
        res.status(500).json({ message: 'An error occurred while adding the borrower.', error: error.message });
    }
});

router.post('/payLoan', async (req, res) => {
    console.log(req.body);

    try {
        const isAuthenticated = await checkAuthentication(req);

        if (isAuthenticated) {
            const { loanID, borrowerid, FullName, monthly, remaining, payment, mode } = req.body;
            console.log(req.body);

             // Insert into the database
             const [insertResult] = await pool.promise().execute(
                'INSERT INTO payments (loan_id, borrower_id, name, remaining, monthly, pay_amount, mode) VALUES (?, ?, ?, ?, ?, ?, ?)', 
                [loanID, borrowerid, FullName, remaining, monthly, payment, mode]
            );

            const [updateResult] = await pool.promise().execute(
                'UPDATE loans SET remaining = remaining - ? WHERE id = ?', 
                [payment, loanID]
            );


            res.status(200).json({ message: 'Loan payment successfully!', result: insertResult, update: updateResult });

        } else {
            // If not authenticated, redirect to the login page
            res.redirect('/user');
        }
    } catch (error) {
        // Handle any errors
        console.error('Error adding borrower:', error);

        // Send a response indicating something went wrong
        res.status(500).json({ message: 'An error occurred while adding the borrower.', error: error.message });
    }
});

router.post('/deleteLoan', async (req, res) => {
    console.log(req.body.id);
    try {
        const isAuthenticated = await checkAuthentication(req);

        if (!isAuthenticated) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ message: 'Loan ID is required' });
        }

        const [result] = await pool.promise().execute(
            'DELETE FROM loans WHERE id = ?',
            [id]
        );

        res.status(200).json({ message: 'Loan deleted successfully!', result });
    } catch (error) {
        console.error('Error deleting Loan:', error);
        res.status(500).json({ message: 'An error occurred while deleting the Loan.', error: error.message });
    }
});

router.get('/loans', async (req, res) => {
    const isAuthenticated = await checkAuthentication(req);

    // console.log(isAuthenticated);
    // console.log(req.path);
    if (isAuthenticated) {
        const loans = await getloans();
        console.log(loans);
        res.render('admin/loans', {data: isAuthenticated, path: req.path, loans: loans});
    } else {
        res.redirect('/user'); // or render a login page
    }
});

router.get('/payments', async (req, res) => {
    const isAuthenticated = await checkAuthentication(req);

    // console.log(isAuthenticated);
    // console.log(req.path);
    if (isAuthenticated) {
        const payments = await getPayments();
        console.log(payments);
        res.render('admin/payments', {data: isAuthenticated, path: req.path, payments: payments});
    } else {
        res.redirect('/user'); // or render a login page
    }
});

router.get('/accounts', async (req, res) => {
    const isAuthenticated = await checkAuthentication(req);

    // console.log(isAuthenticated);
    // console.log(req.path);
    if (isAuthenticated) {
        const accounts = await getUsers();
        console.log(accounts);
        res.render('admin/accounts', {data: isAuthenticated, path: req.path, accounts: accounts});
    } else {
        res.redirect('/user'); // or render a login page
    }
});

router.post('/addAccount', async (req, res) => {
    console.log(req.body);

    try {
        const isAuthenticated = await checkAuthentication(req);

        if (isAuthenticated) {
            const { email, password, firstname, middlename, lastname, bday, age, role, id} = req.body;
                
                // console.log(id);
                if (id) {
                    // If an ID is provided, update the existing borrower
                    const [updateResult] = await pool.promise().execute(
                        'UPDATE users SET email = ?, password = ?, first_name = ?, middle_name = ?, last_name = ?, date_of_birth = ?, age = ?, role = ? WHERE id = ?',
                        [email, password, firstname, middlename, lastname, bday, age, role, id]
                    );

                    console.log(updateResult);

                    res.status(200).json({ message: 'Account updated successfully!', result: updateResult });
                } else {
                // No ID provided, insert a new borrower
                const [insertResult] = await pool.promise().execute(
                    'INSERT INTO users (email, password, first_name, middle_name, last_name, date_of_birth, age, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [email, password, firstname, middlename, lastname, bday, age, role]
                );

                res.status(200).json({ message: 'Account added successfully!', result: insertResult });
            }
        } else {
            res.redirect('/user');
        }
    } catch (error) {
        console.error('Error adding/updating borrower:', error);
        res.status(500).json({ message: 'An error occurred while processing the borrower.', error: error.message });
    }
});

router.post('/deleteAccount', async (req, res) => {
    console.log(req.body.id);
    try {
        const isAuthenticated = await checkAuthentication(req);

        if (!isAuthenticated) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ message: 'Loan ID is required' });
        }

        const [result] = await pool.promise().execute(
            'DELETE FROM users WHERE id = ?',
            [id]
        );

        res.status(200).json({ message: 'User deleted successfully!', result });
    } catch (error) {
        console.error('Error deleting Loan:', error);
        res.status(500).json({ message: 'An error occurred while deleting the user.', error: error.message });
    }
});

router.get('/logout', async (req, res) => {
    res.clearCookie('auth_token'); // remove cookie
    res.redirect('/user'); // redirect to homepage or login page (refresh effect)
});


async function checkAuthentication(req) {
    const token = req.cookies['auth_token'];

    if (!token) return false;

    try {
        const [results] = await pool.promise().execute(
            'SELECT * FROM users WHERE auth_token = ?',
            [token]
        );

        if (results.length > 0) {
            const user = results[0]; // first matching user
            console.log(user);
            return user;
        } else {
            return false;
        }
          
    } catch (err) {
        console.error('Error executing query:', err);
        return false;
    }
}

async function getborrowers() {
    try {
        const [results] = await pool.promise().execute(
            'SELECT * FROM borrowers'
        );

        if (results.length > 0) {
            return results; // return all borrower rows
        } else {
            return false;
        }

    } catch (err) {
        console.error('Error executing query:', err);
        return false;
    }
}

async function getloans() {
    try {
        const [results] = await pool.promise().execute(
            'SELECT * FROM loans'
        );

        if (results.length > 0) {
            return results; // return all borrower rows
        } else {
            return false;
        }

    } catch (err) {
        console.error('Error executing query:', err);
        return false;
    }
}

async function getPayments() {
    try {
        const [results] = await pool.promise().execute(
            'SELECT * FROM payments'
        );

        if (results.length > 0) {
            return results; // return all borrower rows
        } else {
            return false;
        }

    } catch (err) {
        console.error('Error executing query:', err);
        return false;
    }
}

async function getUsers() {
    try {
        const [results] = await pool.promise().execute(
            'SELECT * FROM users'
        );

        if (results.length > 0) {
            return results; // return all borrower rows
        } else {
            return false;
        }

    } catch (err) {
        console.error('Error executing query:', err);
        return false;
    }
}


module.exports = router;
