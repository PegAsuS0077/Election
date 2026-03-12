import { useEffect } from "react";
import Layout from "../components/Layout";
import { useElectionStore } from "../store/electionStore";

export default function EditorialPolicyPage() {
  const lang = useElectionStore((s) => s.lang);

  useEffect(() => {
    document.title = "Editorial Policy – NepalVotes";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Editorial and methodology policy for NepalVotes, including sourcing, correction workflow, and independence standards.");
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", "https://nepalvotes.live/editorial-policy");
    return () => { if (canonical) canonical.setAttribute("href", "https://nepalvotes.live"); };
  }, []);

  return (
    <Layout
      title="Editorial Policy"
      titleNp="सम्पादकीय नीति"
      subtitle="Last updated: March 8, 2026"
      subtitleNp="अन्तिम अपडेट: मार्च ८, २०२६"
    >
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="space-y-8 text-slate-600 dark:text-slate-400 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
              {lang === "np" ? "उद्देश्य" : "Purpose"}
            </h2>
            <p>
              {lang === "np"
                ? "NepalVotes को उद्देश्य सार्वजनिक चुनावी डेटा नागरिकका लागि छिटो, स्पष्ट, र सजिलो रूपमा प्रस्तुत गर्नु हो।"
                : "NepalVotes exists to present public election data in a fast, clear, and easy-to-read format for citizens."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
              {lang === "np" ? "डेटा स्रोत" : "Data Source"}
            </h2>
            <p>
              {lang === "np"
                ? "यो साइट निर्वाचन आयोग नेपालको आधिकारिक परिणाम प्रणालीबाट सङ्कलन गरिएको अन्तिम डेटासेटको अभिलेख प्रयोग गर्छ। अहिले देखाइने संख्या त्यही संरक्षित परिणाम, हाम्रो प्रोसेसिङ, र त्यसबाट तयार पारिएका विश्लेषणमा आधारित छन्।"
                : "This site now uses an archived final dataset collected from the Election Commission of Nepal's official results system. The numbers shown here reflect that preserved source data, our processing pipeline, and analysis derived from it."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
              {lang === "np" ? "सम्पादकीय स्वतन्त्रता" : "Editorial Independence"}
            </h2>
            <p>
              {lang === "np"
                ? "हामी कुनै राजनीतिक दल, उम्मेदवार, वा सरकारी निकायसँग आबद्ध छैनौं। कुनै पार्टी वा संस्थाले हाम्रो डेटा प्रस्तुतीकरण नियन्त्रण गर्दैन।"
                : "We are not affiliated with any political party, candidate, or government body. No political or commercial entity controls our election-data presentation."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
              {lang === "np" ? "सुधार नीति" : "Corrections Policy"}
            </h2>
            <p className="mb-3">
              {lang === "np"
                ? "यदि पृष्ठमा देखिएको जानकारीमा त्रुटि देखिएमा हामी स्रोत र आन्तरिक प्रोसेसिङ दुबै जाँच गर्छौं।"
                : "If users report incorrect information, we verify both the upstream source and our own processing pipeline."}
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>
                {lang === "np"
                  ? "आधिकारिक स्रोत र हाम्रो संरक्षित अभिलेखबीच फरक भेटिएमा हामी दुवै तुलना गरेर आवश्यक भए अभिलेख अद्यावधिक गर्छौं।"
                  : "If we find a discrepancy between the official source and our preserved archive, we compare both and update the archive when needed."}
              </li>
              <li>
                {lang === "np"
                  ? "हाम्रो पार्सिङमा त्रुटि भए: फिक्स, परीक्षण, र पुनःडिप्लोय गरिन्छ।"
                  : "If parsing or display logic is wrong on our side, we patch the code, test, and redeploy."}
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
              {lang === "np" ? "विज्ञापन नीति" : "Advertising Policy"}
            </h2>
            <p>
              {lang === "np"
                ? "विज्ञापनले सामग्री वा निर्वाचन डेटाको क्रम, अर्थ, वा दृश्यलाई प्रभावित गर्दैन। हामी भ्रामक विज्ञापन प्लेसमेन्ट, जबरजस्ती क्लिक, वा सामग्री छोप्ने विज्ञापन व्यवहार स्वीकार गर्दैनौं।"
                : "Advertising does not influence election data, ranking, or editorial presentation. We do not permit deceptive ad placements, forced clicks, or ad behavior that blocks core content."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
              {lang === "np" ? "सम्पर्क" : "Contact"}
            </h2>
            <p>
              {lang === "np"
                ? "सम्पादकीय नीति वा सुधार अनुरोधका लागि सम्पर्क:"
                : "For editorial questions or correction requests, contact:"}
            </p>
            <p className="mt-2">
              <a
                href="mailto:riwajghimire1@gmail.com"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                riwajghimire1@gmail.com
              </a>
            </p>
          </section>
        </div>
      </main>
    </Layout>
  );
}
