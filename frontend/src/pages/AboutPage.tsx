import { useEffect } from "react";
import Layout from "../components/Layout";
import { useElectionStore } from "../store/electionStore";

export default function AboutPage() {
  const lang = useElectionStore((s) => s.lang);

  useEffect(() => {
    document.title = "About – NepalVotes | Nepal Election Results 2082";
  }, []);

  return (
    <Layout
      title="About NepalVotes"
      titleNp="नेपालभोट्सबारे"
      subtitle="Independent live election results platform"
      subtitleNp="स्वतन्त्र लाइभ निर्वाचन परिणाम मञ्च"
    >
      <main className="max-w-3xl mx-auto px-6 py-12">
        <section className="prose prose-slate dark:prose-invert max-w-none">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
            {lang === "np" ? "हाम्रोबारे" : "What is NepalVotes?"}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
            {lang === "np"
              ? "नेपालभोट्स एउटा स्वतन्त्र डिजिटल मञ्च हो जसले नेपालको प्रतिनिधि सभा निर्वाचन २०८२ को मतगणना परिणाम वास्तविक समयमा प्रदर्शन गर्दछ। यो मञ्च कुनै पनि राजनीतिक दल वा सरकारी निकायसँग आबद्ध छैन।"
              : "NepalVotes is an independent digital platform that displays real-time vote count results for Nepal's House of Representatives (HoR) General Election 2082 (2026). It is not affiliated with any political party, government body, or the Election Commission of Nepal."}
          </p>

          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
            {lang === "np" ? "डेटा स्रोत" : "Data Source"}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
            {lang === "np"
              ? "सबै मतगणना डेटा निर्वाचन आयोग नेपालको आधिकारिक वेबसाइटबाट स्वचालित रूपमा लिइन्छ। डेटा हरेक ३० सेकेन्डमा अपडेट हुन्छ।"
              : "All vote count data is fetched automatically from the official website of the Election Commission of Nepal. Data refreshes every 30 seconds."}
          </p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
            {lang === "np" ? "आधिकारिक स्रोत:" : "Official source:"}{" "}
            <a
              href="https://result.election.gov.np"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              result.election.gov.np
            </a>
          </p>

          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
            {lang === "np" ? "अस्वीकरण" : "Disclaimer"}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
            {lang === "np"
              ? "यो मञ्चले प्रदर्शन गरेको डेटा जानकारीको लागि मात्र हो। आधिकारिक परिणामको लागि कृपया निर्वाचन आयोग नेपालको वेबसाइट हेर्नुहोस्। हामी डेटाको शतप्रतिशत सटीकताको ग्यारेन्टी गर्दैनौं।"
              : "The data displayed on this platform is for informational purposes only. For official results, please refer to the Election Commission of Nepal's website. We do not guarantee 100% accuracy of the data as it is sourced from a third-party API."}
          </p>

          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
            {lang === "np" ? "कभरेज" : "Coverage"}
          </h2>
          <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 leading-relaxed space-y-1 mb-6">
            <li>{lang === "np" ? "१६५ निर्वाचन क्षेत्रहरू" : "165 constituencies"}</li>
            <li>{lang === "np" ? "७ प्रदेशहरू" : "7 provinces"}</li>
            <li>{lang === "np" ? "प्रमुख राजनीतिक दलहरू" : "All major political parties"}</li>
            <li>{lang === "np" ? "उम्मेद्वार-स्तरीय परिणाम" : "Candidate-level results"}</li>
            <li>{lang === "np" ? "२७५ सिटहरू (प्रतिनिधि सभा)" : "275 total seats (House of Representatives)"}</li>
          </ul>
        </section>
      </main>
    </Layout>
  );
}
