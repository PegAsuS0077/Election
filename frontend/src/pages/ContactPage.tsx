import { useEffect } from "react";
import Layout from "../components/Layout";
import { useElectionStore } from "../store/electionStore";

export default function ContactPage() {
  const lang = useElectionStore((s) => s.lang);

  useEffect(() => {
    document.title = "Contact – NepalVotes";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Contact NepalVotes — the independent Nepal Election Results 2082 dashboard. Reach us by email for data issues, feedback, or press enquiries.");
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", "https://nepalvotes.live/contact");
    return () => { if (canonical) canonical.setAttribute("href", "https://nepalvotes.live"); };
  }, []);

  return (
    <Layout
      title="Contact Us"
      titleNp="सम्पर्क गर्नुहोस्"
      subtitle="Get in touch with the NepalVotes team"
      subtitleNp="नेपालभोट्स टिमसँग सम्पर्क गर्नुहोस्"
    >
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="space-y-8 text-slate-600 dark:text-slate-400 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
              {lang === "np" ? "हामीसँग सम्पर्क गर्नुहोस्" : "Reach Us"}
            </h2>
            <p className="mb-4">
              {lang === "np"
                ? "NepalVotes एउटा स्वतन्त्र मञ्च हो। डेटा सम्बन्धी समस्याहरू, सुझावहरू, वा अन्य जिज्ञासाहरूको लागि तलको इमेलमा सम्पर्क गर्नुहोस्।"
                : "NepalVotes is an independent platform. For data-related issues, suggestions, or any other inquiries, reach out via the email below."}
            </p>

            <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
              <span className="text-2xl">✉️</span>
              <div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-500 uppercase tracking-wide mb-0.5">
                  {lang === "np" ? "इमेल" : "Email"}
                </div>
                <a
                  href="mailto:riwajghimire1@gmail.com"
                  className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
                >
                  riwajghimire1@gmail.com
                </a>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
              {lang === "np" ? "डेटा स्रोत सम्बन्धी समस्या" : "Data Issues"}
            </h2>
            <p>
              {lang === "np"
                ? "यदि तपाईंले डेटामा कुनै त्रुटि फेला पार्नुभयो भने, कृपया ध्यान दिनुहोस् कि हाम्रो डेटा सिधै निर्वाचन आयोग नेपालको आधिकारिक API बाट आउँछ। आधिकारिक परिणामको लागि कृपया "
                : "If you notice a data discrepancy, please note that our data comes directly from the Election Commission of Nepal's official API. For official results, please refer to "}
              <a
                href="https://result.election.gov.np"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                result.election.gov.np
              </a>
              {lang === "np" ? " हेर्नुहोस्।" : "."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
              {lang === "np" ? "प्रतिक्रिया समय" : "Response Time"}
            </h2>
            <p>
              {lang === "np"
                ? "हामी सामान्यतः १-२ कार्य दिनभित्र जवाफ दिन्छौं। निर्वाचन अवधिमा ढिलाइ हुन सक्छ।"
                : "We typically respond within 1–2 business days. During the election period, responses may be delayed."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
              {lang === "np" ? "के बारेमा सम्पर्क गर्न सकिन्छ?" : "What Can You Contact Us About?"}
            </h2>
            <ul className="list-disc list-inside space-y-2">
              <li>{lang === "np" ? "डेटामा त्रुटि वा विसङ्गति" : "Data errors or discrepancies you notice"}</li>
              <li>{lang === "np" ? "साइटको सुविधा वा सुझाव" : "Feature suggestions or improvements"}</li>
              <li>{lang === "np" ? "प्रेस वा मिडिया सम्बन्धी जानकारी" : "Press or media enquiries"}</li>
              <li>{lang === "np" ? "सामान्य प्रतिक्रिया" : "General feedback about the platform"}</li>
            </ul>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-500">
              {lang === "np"
                ? "कृपया ध्यान दिनुहोस्: हामी निर्वाचन परिणामहरू परिवर्तन गर्न वा निर्वाचन आयोगसँग पैरवी गर्न सक्दैनौं।"
                : "Please note: we cannot alter election results or intervene with the Election Commission on any matter. We only control the presentation of data, not the data itself."}
            </p>
          </section>

        </div>
      </main>
    </Layout>
  );
}
