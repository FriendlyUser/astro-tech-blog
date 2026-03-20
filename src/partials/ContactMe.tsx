import React, { useState } from 'react';

const ContactMe = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    message: '',
  });

  const [status, setStatus] = useState('');

  // Handle input changes dynamically based on the "name" attribute
  const handleChange = (e: { target: { name: any; value: any; }; }) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    setStatus('Sending...');

    try {
      const response = await fetch("https://formspree.io/f/davidli012345@gmail.com", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setStatus('Thanks! Your message has been sent.');
        setFormData({ firstName: '', lastName: '', email: '', message: '' }); // Reset form
      } else {
        const data = await response.json();
        setStatus(data.error || 'Oops! There was a problem submitting your form');
      }
    } catch (error) {
      setStatus('Oops! There was a problem submitting your form');
    }
  };

  return (
    <form className="max-w-lg" onSubmit={handleSubmit}>
      <div className="-mx-3 mb-6 flex flex-wrap">
        <div className="mb-6 w-full px-3 md:mb-0 md:w-1/2">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide" htmlFor="firstName">
            First Name
          </label>
          <input
            className="mb-3 block w-full appearance-none rounded py-3 px-4 leading-tight text-gray-700 focus:bg-white focus:outline-none"
            id="firstName"
            name="firstName" // Matches state key
            type="text"
            placeholder="Jane"
            value={formData.firstName}
            onChange={handleChange}
            required
          />
        </div>
        <div className="w-full px-3 md:w-1/2">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide" htmlFor="lastName">
            Last Name
          </label>
          <input
            className="block w-full appearance-none rounded border border-gray-200 py-3 px-4 leading-tight text-gray-700 focus:border-gray-500 focus:bg-white focus:outline-none"
            id="lastName"
            name="lastName"
            type="text"
            placeholder="Doe"
            value={formData.lastName}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="-mx-3 mb-6 flex flex-wrap">
        <div className="w-full px-3">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide" htmlFor="email">
            E-mail
          </label>
          <input
            className="mb-3 block w-full appearance-none rounded border py-3 px-4 leading-tight text-gray-700 focus:border-gray-500 focus:bg-white focus:outline-none"
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="-mx-3 mb-6 flex flex-wrap">
        <div className="w-full px-3">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide" htmlFor="message">
            Message
          </label>
          <textarea
            className="no-resize mb-3 block h-48 w-full resize-none appearance-none rounded border border-gray-200 py-3 px-4 leading-tight text-gray-700 focus:border-gray-500 focus:bg-white focus:outline-none"
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="md:flex md:items-center">
        <div className="md:w-1/3">
          <button
            className="ml-2 shrink-0 rounded-full bg-gradient-to-br from-sky-500 to-cyan-400 px-3 py-1 text-sm font-medium text-gray-700 hover:from-sky-700 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/50 disabled:opacity-50"
            type="submit"
            disabled={status === 'Sending...'}
          >
            Send
          </button>
        </div>
        <div className="md:w-2/3">
          {status && <p className="text-xs italic ml-4">{status}</p>}
        </div>
      </div>
    </form>
  );
};

export { ContactMe };