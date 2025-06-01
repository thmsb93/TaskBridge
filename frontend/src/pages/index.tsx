import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Home from "@/components/Main";

export default function MainPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow overflow-y-auto">
                <Home />
            </main>
            <Footer />
        </div>
    );
}
