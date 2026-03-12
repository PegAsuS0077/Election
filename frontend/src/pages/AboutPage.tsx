import { useEffect } from "react";
import Layout from "../components/Layout";
import { useElectionStore } from "../store/electionStore";

export default function AboutPage() {
  const lang = useElectionStore((s) => s.lang);

  useEffect(() => {
    document.title = "About – NepalVotes | Nepal Election Results 2082";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "About NepalVotes — an independent archive, analysis, and news platform for Nepal's House of Representatives General Election 2082 (2026). Data sourced from the Election Commission of Nepal.");
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", "https://nepalvotes.live/about");
    return () => { if (canonical) canonical.setAttribute("href", "https://nepalvotes.live"); };
  }, []);

  return (
    <Layout
      title="About NepalVotes"
      titleNp="नेपालभोट्सबारे"
      subtitle="Independent final-results archive, analysis, and news platform for Nepal 2082"
      subtitleNp="नेपाल निर्वाचन २०८२ को स्वतन्त्र अन्तिम परिणाम, विश्लेषण र समाचार मञ्च"
    >
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-10">

        {/* What is NepalVotes */}
        <section>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
            {lang === "np" ? "हाम्रोबारे" : "What is NepalVotes?"}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
            {lang === "np"
              ? "नेपालभोट्स एउटा स्वतन्त्र डिजिटल मञ्च हो जसले नेपालको प्रतिनिधि सभा निर्वाचन २०८२ (मार्च ५, २०२६) को अन्तिम परिणाम, डेटा दृश्यांकन, र विश्लेषणात्मक सामग्री प्रस्तुत गर्दछ। यो मञ्च कुनै पनि राजनीतिक दल, सरकारी निकाय वा निर्वाचन आयोगसँग आबद्ध छैन।"
              : "NepalVotes is an independent digital platform for final results, data visualisation, and analysis of Nepal's House of Representatives (Pratinidhi Sabha) General Election 2082 (2026). It is not affiliated with any political party, government body, or the Election Commission of Nepal."}
          </p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            {lang === "np"
              ? "हाम्रो लक्ष्य भनेको नागरिक, विद्यार्थी, पत्रकार र शोधकर्ताहरूलाई अन्तिम चुनावी डेटा सजिलो तरिकाले बुझ्न, खोज्न र विश्लेषण गर्न सकिने मञ्च उपलब्ध गराउनु हो — कुनै पनि राजनीतिक पूर्वाग्रह बिना।"
              : "Our aim is to give citizens, students, journalists, and researchers a clean and accessible place to understand, browse, and analyse the final election data — without political bias or unnecessary complexity."}
          </p>
        </section>

        {/* Data Source */}
        <section>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
            {lang === "np" ? "डेटा स्रोत" : "Data Source"}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
            {lang === "np"
              ? "सबै परिणाम डेटा निर्वाचन आयोग नेपालको आधिकारिक परिणाम वेबसाइटबाट प्राप्त गरिएको अभिलेखमा आधारित छ। चुनावपछि यो साइटले त्यही डेटा सुरक्षित राखेर विश्लेषण र प्रकाशनका लागि प्रयोग गर्छ।"
              : "All result data is based on the official results website of the Election Commission of Nepal. After the election, the site preserves that dataset as an archive for analysis and publishing."}
          </p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
            {lang === "np" ? "आधिकारिक स्रोत:" : "Official source:"}
          </p>
          <a
            href="https://result.election.gov.np"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            result.election.gov.np
          </a>
        </section>

        {/* Coverage */}
        <section>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
            {lang === "np" ? "कभरेज" : "Coverage"}
          </h2>
          <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 leading-relaxed space-y-2">
            <li>{lang === "np" ? "१६५ प्रत्यक्ष (FPTP) निर्वाचन क्षेत्रहरू" : "165 First-Past-The-Post (FPTP) constituencies"}</li>
            <li>{lang === "np" ? "७ प्रदेशहरू" : "7 provinces — Koshi, Madhesh, Bagmati, Gandaki, Lumbini, Karnali, Sudurpashchim"}</li>
            <li>{lang === "np" ? "३,४०६ उम्मेदवारहरू" : "3,406 candidates across all constituencies"}</li>
            <li>{lang === "np" ? "६६+ दर्ता राजनीतिक दलहरू र स्वतन्त्र उम्मेदवारहरू" : "66+ registered political parties and independents"}</li>
            <li>{lang === "np" ? "२७५ सिट (१६५ FPTP + ११० समानुपातिक)" : "275 total seats (165 FPTP + 110 proportional representation)"}</li>
            <li>{lang === "np" ? "उम्मेदवार-स्तरीय विवरण पृष्ठहरू" : "Individual candidate profile pages with biographical data"}</li>
          </ul>
        </section>

        {/* How it works */}
        <section>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
            {lang === "np" ? "यसले कसरी काम गर्छ?" : "How Does It Work?"}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
            {lang === "np"
              ? "निर्वाचन आयोगको सर्भरले परिणाम JSON फाइलमार्फत प्रकाशित गरेको डेटा हाम्रो प्रणालीले सङ्कलन र संरक्षित गर्‍यो। अहिले साइटले त्यही saved dataset बाट निर्वाचन क्षेत्र, उम्मेदवार, दल, नक्सा, र विश्लेषण पृष्ठहरू निर्माण गर्छ।"
              : "The Election Commission published results through JSON files, and our system collected and preserved that data. The site now builds constituency pages, candidate profiles, party views, maps, and analysis directly from that saved dataset."}
          </p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            {lang === "np"
              ? "अब यो साइटको मुख्य उपयोग पोस्ट-इलेक्शन अभिलेख, परिणाम दृश्यांकन, र व्याख्यात्मक सामग्री हो।"
              : "The site's primary use now is post-election archiving, result visualisation, and explanatory coverage."}
          </p>
        </section>

        {/* Disclaimer */}
        <section>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
            {lang === "np" ? "अस्वीकरण" : "Disclaimer"}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            {lang === "np"
              ? "यो मञ्चले प्रदर्शन गरेको डेटा जानकारीको लागि मात्र हो। आधिकारिक र अन्तिम परिणामको लागि कृपया निर्वाचन आयोग नेपालको वेबसाइट हेर्नुहोस्। हामी डेटाको शतप्रतिशत सटीकताको ग्यारेन्टी गर्दैनौं — डेटा सीधै तेस्रो पक्षको (निर्वाचन आयोग) API बाट लिइन्छ। NepalVotes एउटा स्वतन्त्र ड्यासबोर्ड हो जसको अन्तर्निहित डेटामाथि कुनै सम्पादकीय नियन्त्रण छैन।"
              : "The data displayed on this platform is for informational purposes only. For the official and final results, please refer to the Election Commission of Nepal's website. We do not guarantee 100% accuracy as data is sourced directly from a third-party API (the Election Commission). NepalVotes is an independent dashboard with no editorial control over the underlying data."}
          </p>
        </section>

        {/* Independence statement */}
        <section>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
            {lang === "np" ? "स्वतन्त्रता" : "Independence"}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            {lang === "np"
              ? "NepalVotes कुनै पनि राजनीतिक दल, उम्मेदवार, मिडिया संस्था वा सरकारी निकायसँग आबद्ध छैन। यो साइट कुनै पनि दलको समर्थन गर्दैन वा विरोध गर्दैन। हाम्रो एकमात्र उद्देश्य नागरिकहरूलाई सार्वजनिक रूपमा उपलब्ध आधिकारिक चुनावी डेटासम्म सजिलो पहुँच प्रदान गर्नु हो।"
              : "NepalVotes is not affiliated with any political party, candidate, media organisation, or government body. The site does not endorse or oppose any party or candidate. Our sole purpose is to give citizens easy access to publicly available, official electoral data in a clear and readable format."}
          </p>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
            {lang === "np" ? "सम्पर्क" : "Contact"}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            {lang === "np"
              ? "प्रश्न, सुझाव, वा डेटा सम्बन्धी समस्याको लागि इमेलमा सम्पर्क गर्नुहोस्:"
              : "For questions, suggestions, or data-related issues, contact us by email:"}
          </p>
          <a
            href="mailto:riwajghimire1@gmail.com"
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            riwajghimire1@gmail.com
          </a>
        </section>

      </main>
    </Layout>
  );
}
