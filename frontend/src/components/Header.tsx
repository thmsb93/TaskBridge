import { useState } from "react";

export default function Header() {
    const [isAboutOpen, setIsAboutOpen] = useState(false);
    return (
        <header className="bg-gray-100 border-gray-300 border-t flex items-center justify-between py-4 pr-4">
            <div className="flex items-center gap-6 ml-4">
                <p className="text-gray-600">TB<br />Embrace yourself.</p>
            </div>
            <div className="text-center flex-grow">
                <p className="text-gray-600 font-bold text-xl">TaskBridge</p>
            </div>
            <nav className="flex items-center gap-6">
                {/* Navigation Buttons */}
                <button
                    onClick={() => setIsAboutOpen(true)}
                    className="text-gray-600 hover:text-blue-500 transition"
                >
                    About
                </button>
                <a
                    // You could replace this with a real link to any Teams channel or documentation
                    href="https://www.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-blue-500 transition"
                >
                    Contact
                </a>
                <a
                    href="https://www.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-blue-500 transition"
                >
                    Documentation
                </a>
            </nav>

            {/* About Pop-up */}
            {isAboutOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded shadow-lg max-w-md w-full">
                        <h2 className="text-xl font-bold mb-4">About</h2>
                        <p className="text-gray-700 text-center">
                            So, you found the 'About' button! Now, what's your super-secret question?
                        </p>
                        <button
                            onClick={() => setIsAboutOpen(false)}
                            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </header>
    );
}
