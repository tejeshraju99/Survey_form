import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';

const BACKEND_URL = 'https://surveyform-production.up.railway.app';
const SURVEY_URL = typeof window !== 'undefined' ? window.location.origin : 'https://surveyform-rose.vercel.app';

interface Product {
  name: string;
  unit_cost: number;
}

interface ProductEntry {
  product_name: string;
  unit_cost: number;
  retail_price: number | null;
  percent_difference: number | null;
}

// Full customer record from CSV
interface Customer {
  'Customer ID': string;
  'Customer Name': string;
  'AR Account': string;
  'Chain': string;
  'Phone': string;
  'Territory': string;
  'Account Status': string;
  'Customer Type': string;
  'Last Month Sales': string;
  'Product Group': string;
  'Distribution Area': string;
}

interface Survey {
  id: string;
  date_of_survey: string;
  // Customer fields
  customer_id: string;
  customer_name: string;
  ar_account: string;
  chain: string;
  phone: string;
  territory: string;
  account_status: string;
  customer_type: string;
  last_month_sales: string;
  product_group: string;
  distribution_area: string;
  // Legacy fields kept for backward compat
  account_manager: string;
  account_name: string;
  state: string;
  region: string;
  county: string;
  products: ProductEntry[];
  created_at: string;
}

type Tab = 'survey' | 'submissions' | 'qrcode';

export default function Index() {
  const [activeTab, setActiveTab] = useState<Tab>('survey');

  // Survey Form State
  const [dateOfSurvey, setDateOfSurvey] = useState('');

  // Customer search state
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedState, setSelectedState] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedCounty, setSelectedCounty] = useState('');

  // Data State
  const [states, setStates] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [counties, setCounties] = useState<string[]>([]);
  const [products, setProducts] = useState<{ [category: string]: Product[] }>({});
  const [retailPrices, setRetailPrices] = useState<{ [key: string]: string }>({});

  // Additional survey questions
  const [displaysPriceTags, setDisplaysPriceTags] = useState('');
  const [missingShelfTags, setMissingShelfTags] = useState('');
  const [comments, setComments] = useState('');

  // Submissions State
  const [submissions, setSubmissions] = useState<Survey[]>([]);

  // UI State
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    fetchStates();
  }, []);

  useEffect(() => {
    if (activeTab === 'submissions') {
      fetchSubmissions();
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedState) {
      fetchRegions(selectedState);
      setSelectedRegion('');
      setSelectedCounty('');
      setProducts({});
      setRetailPrices({});
    }
  }, [selectedState]);

  useEffect(() => {
    if (selectedState && selectedRegion) {
      fetchCounties(selectedState, selectedRegion);
      fetchProducts(selectedState, selectedRegion);
      setSelectedCounty('');
    }
  }, [selectedRegion]);

  // Debounced customer search
  useEffect(() => {
    if (customerQuery.length < 2) {
      setCustomerResults([]);
      setShowDropdown(false);
      return;
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      searchCustomers(customerQuery);
    }, 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [customerQuery]);

  const searchCustomers = async (query: string) => {
    setSearchLoading(true);
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/customers/search?query=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      setCustomerResults(data.results || []);
      setShowDropdown(true);
    } catch (error) {
      console.error('Error searching customers:', error);
    }
    setSearchLoading(false);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerQuery(customer['Customer Name']);
    setShowDropdown(false);
    setCustomerResults([]);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerQuery('');
    setShowDropdown(false);
    setCustomerResults([]);
  };

  const fetchStates = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/states`);
      const data = await response.json();
      setStates(data.states);
    } catch (error) {
      console.error('Error fetching states:', error);
    }
  };

  const fetchRegions = async (state: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/regions/${encodeURIComponent(state)}`);
      const data = await response.json();
      setRegions(data.regions);
    } catch (error) {
      console.error('Error fetching regions:', error);
    }
  };

  const fetchCounties = async (state: string, region: string) => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/counties/${encodeURIComponent(state)}/${encodeURIComponent(region)}`
      );
      const data = await response.json();
      setCounties(data.counties);
    } catch (error) {
      console.error('Error fetching counties:', error);
    }
  };

  const fetchProducts = async (state: string, region: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/products/${encodeURIComponent(state)}/${encodeURIComponent(region)}`
      );
      const data = await response.json();
      setProducts(data.products);
      const expanded: { [key: string]: boolean } = {};
      Object.keys(data.products).forEach((cat) => {
        expanded[cat] = false;
      });
      setExpandedCategories(expanded);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
    setLoading(false);
  };

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/surveys`);
      const data = await response.json();
      setSubmissions(data);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
    setLoading(false);
  };

  // Margin % = (Retail - Cost) / Retail * 100
  // This tells you what % of the retail price is profit.
  // e.g. Cost $2.72, Retail $2.90 → (2.90-2.72)/2.90*100 = +6.2%
  const calculatePercentDifference = (unitCost: number, retailPrice: number): number => {
    if (retailPrice === 0) return 0;
    return ((retailPrice - unitCost) / retailPrice) * 100;
  };

  const handleRetailPriceChange = (productKey: string, value: string) => {
    setRetailPrices((prev) => ({ ...prev, [productKey]: value }));
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const handleSubmit = async () => {
    if (!dateOfSurvey || !selectedCustomer || !selectedState || !selectedRegion || !selectedCounty) {
      Alert.alert('Error', 'Please fill in all required fields including selecting a customer');
      return;
    }

    const productEntries: ProductEntry[] = [];
    Object.entries(products).forEach(([category, productList]) => {
      productList.forEach((product, index) => {
        const key = `${category}-${index}`;
        const retailStr = retailPrices[key];
        if (retailStr && retailStr.trim() !== '') {
          const retailPrice = parseFloat(retailStr);
          if (!isNaN(retailPrice)) {
            productEntries.push({
              product_name: product.name,
              unit_cost: product.unit_cost,
              retail_price: retailPrice,
              percent_difference: calculatePercentDifference(product.unit_cost, retailPrice),
            });
          }
        }
      });
    });

    if (productEntries.length === 0) {
      Alert.alert('Error', 'Please enter at least one retail price');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/surveys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date_of_survey: dateOfSurvey,
          // Full customer data
          customer_id: selectedCustomer['Customer ID'],
          customer_name: selectedCustomer['Customer Name'],
          ar_account: selectedCustomer['AR Account'],
          chain: selectedCustomer['Chain'],
          phone: selectedCustomer['Phone'] || '',
          territory: selectedCustomer['Territory'] || '',
          account_status: selectedCustomer['Account Status'] || '',
          customer_type: selectedCustomer['Customer Type'] || '',
          last_month_sales: selectedCustomer['Last Month Sales'] || '',
          product_group: selectedCustomer['Product Group'] || '',
          distribution_area: selectedCustomer['Distribution Area'] || '',
          // Additional questions
          displays_price_tags: displaysPriceTags,
          missing_shelf_tags: missingShelfTags,
          comments: comments,
          // Legacy fields for backward compat
          account_manager: selectedCustomer['Customer Name'],
          account_name: selectedCustomer['AR Account'],
          state: selectedState,
          region: selectedRegion,
          county: selectedCounty,
          products: productEntries,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Survey submitted successfully!');
        setDateOfSurvey('');
        setSelectedCustomer(null);
        setCustomerQuery('');
        setSelectedState('');
        setSelectedRegion('');
        setSelectedCounty('');
        setProducts({});
        setRetailPrices({});
        setRegions([]);
        setCounties([]);
        setDisplaysPriceTags('');
        setMissingShelfTags('');
        setComments('');
      } else {
        // Log the actual server error for debugging
        const errBody = await response.text().catch(() => '');
        console.error('Submit failed:', response.status, errBody);
        Alert.alert('Error', `Submit failed (${response.status}). Check console for details.`);
      }
    } catch (error) {
      console.error('Error submitting survey:', error);
      Alert.alert('Error', 'Network error - could not reach server. Please try again.');
    }
    setSubmitting(false);
  };

  const handleExportCSV = async () => {
    try {
      const url = `${BACKEND_URL}/api/surveys/export/csv`;
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      Alert.alert('Error', 'Failed to export CSV');
    }
  };


  const renderDropdown = (
    label: string,
    options: string[],
    selected: string,
    onSelect: (value: string) => void
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.dropdownContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.dropdownOption, selected === option && styles.dropdownOptionSelected]}
            onPress={() => onSelect(option)}
          >
            <Text
              style={[
                styles.dropdownOptionText,
                selected === option && styles.dropdownOptionTextSelected,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderCustomerSearch = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>Account / Customer *</Text>
      <Text style={styles.sublabel}>Type at least 2 characters to search by name, ID, or AR Account</Text>

      <View style={styles.searchWrapper}>
        <View style={styles.searchInputRow}>
          <Ionicons name="search-outline" size={16} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={customerQuery}
            onChangeText={(text) => {
              setCustomerQuery(text);
              if (selectedCustomer) setSelectedCustomer(null);
            }}
            placeholder="Search customer..."
            placeholderTextColor="#555"
          />
          {(customerQuery.length > 0 || selectedCustomer) && (
            <TouchableOpacity onPress={handleClearCustomer} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color="#666" />
            </TouchableOpacity>
          )}
          {searchLoading && <ActivityIndicator size="small" color="#2196F3" style={{ marginLeft: 6 }} />}
        </View>

        {/* Dropdown results */}
        {showDropdown && customerResults.length > 0 && (
          <View style={styles.resultsDropdown}>
            {customerResults.map((item) => (
              <TouchableOpacity
                key={item['Customer ID']}
                style={styles.resultItem}
                onPress={() => handleSelectCustomer(item)}
              >
                <View style={styles.resultMain}>
                  <Text style={styles.resultName} numberOfLines={1}>
                    {item['Customer Name']}
                  </Text>
                  <Text style={styles.resultSub}>
                    ID: {item['Customer ID']} · {item['Customer Type']}
                  </Text>
                </View>
                <Text style={styles.resultAR} numberOfLines={1}>
                  {item['AR Account']}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {showDropdown && customerResults.length === 0 && !searchLoading && customerQuery.length >= 2 && (
          <View style={styles.resultsDropdown}>
            <Text style={styles.noResults}>No customers found</Text>
          </View>
        )}
      </View>

      {/* Selected customer card */}
      {selectedCustomer && (
        <View style={styles.selectedCard}>
          <View style={styles.selectedCardHeader}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.selectedCardTitle}>Selected Customer</Text>
          </View>
          <View style={styles.selectedCardGrid}>
            <View style={styles.selectedCardRow}>
              <Text style={styles.selectedCardLabel}>Customer ID</Text>
              <Text style={styles.selectedCardValue}>{selectedCustomer['Customer ID']}</Text>
            </View>
            <View style={styles.selectedCardRow}>
              <Text style={styles.selectedCardLabel}>Name</Text>
              <Text style={styles.selectedCardValue} numberOfLines={2}>{selectedCustomer['Customer Name']}</Text>
            </View>
            <View style={styles.selectedCardRow}>
              <Text style={styles.selectedCardLabel}>AR Account</Text>
              <Text style={styles.selectedCardValue} numberOfLines={1}>{selectedCustomer['AR Account']}</Text>
            </View>
            <View style={styles.selectedCardRow}>
              <Text style={styles.selectedCardLabel}>Chain</Text>
              <Text style={styles.selectedCardValue} numberOfLines={1}>{selectedCustomer['Chain']}</Text>
            </View>
            <View style={styles.selectedCardRow}>
              <Text style={styles.selectedCardLabel}>Type</Text>
              <Text style={styles.selectedCardValue}>{selectedCustomer['Customer Type']}</Text>
            </View>
            <View style={styles.selectedCardRow}>
              <Text style={styles.selectedCardLabel}>Territory</Text>
              <Text style={styles.selectedCardValue}>{selectedCustomer['Territory']}</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  const renderQRCode = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.centeredContent}>
      <View style={styles.qrContainer}>
        <Text style={styles.qrTitle}>Scan to Access Survey</Text>
        <Text style={styles.qrSubtitle}>Share this QR code with your Reps</Text>

        <View style={styles.qrBox}>
          <QRCode value={SURVEY_URL} size={200} backgroundColor="#ffffff" color="#000000" />
        </View>

        <Text style={styles.qrUrl}>{SURVEY_URL}</Text>

        <TouchableOpacity
          style={styles.copyButton}
          onPress={() => {
            if (Platform.OS === 'web') {
              navigator.clipboard.writeText(SURVEY_URL);
              Alert.alert('Copied', 'URL copied to clipboard!');
            }
          }}
        >
          <Ionicons name="copy-outline" size={18} color="#fff" />
          <Text style={styles.copyButtonText}>Copy Link</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderSurveyForm = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.centeredContent}>
      <View style={styles.formContainer}>
        <Text style={styles.sectionTitle}>Survey Information</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Date of Survey *</Text>
          <TextInput
            style={styles.input}
            value={dateOfSurvey}
            onChangeText={setDateOfSurvey}
            placeholder="e.g., 07/15/2025"
            placeholderTextColor="#555"
          />
        </View>

        {renderCustomerSearch()}

        <Text style={styles.sectionTitle}>Location</Text>

        {renderDropdown('State *', states, selectedState, setSelectedState)}

        {selectedState && renderDropdown('Region *', regions, selectedRegion, setSelectedRegion)}

        {selectedRegion && renderDropdown('County *', counties, selectedCounty, setSelectedCounty)}

        {loading ? (
          <ActivityIndicator size="large" color="#2196F3" style={styles.loader} />
        ) : (
          Object.keys(products).length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Products & Pricing</Text>
              <Text style={styles.instructions}>
                Enter retail prices. % difference auto-calculated.
              </Text>

              {Object.entries(products).map(([category, productList]) => (
                <View key={category} style={styles.categoryContainer}>
                  <TouchableOpacity
                    style={styles.categoryHeader}
                    onPress={() => toggleCategory(category)}
                  >
                    <Text style={styles.categoryTitle}>{category}</Text>
                    <Ionicons
                      name={expandedCategories[category] ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#fff"
                    />
                  </TouchableOpacity>

                  {expandedCategories[category] && (
                    <View style={styles.productList}>
                      {productList.map((product, index) => {
                        const key = `${category}-${index}`;
                        const retailValue = retailPrices[key] || '';
                        const retailNum = parseFloat(retailValue);
                        const percentDiff =
                          !isNaN(retailNum) && retailValue !== ''
                            ? calculatePercentDifference(product.unit_cost, retailNum)
                            : null;

                        return (
                          <View key={key} style={styles.productRow}>
                            <View style={styles.productInfo}>
                              <Text style={styles.productName}>{product.name}</Text>
                              <Text style={styles.unitCost}>
                                Unit: ${product.unit_cost.toFixed(2)}
                              </Text>
                            </View>
                            <View style={styles.priceInputContainer}>
                              <TextInput
                                style={styles.priceInput}
                                value={retailValue}
                                onChangeText={(value) => handleRetailPriceChange(key, value)}
                                placeholder="$"
                                placeholderTextColor="#555"
                                keyboardType="decimal-pad"
                              />
                              {percentDiff !== null && (
                                <Text
                                  style={[
                                    styles.percentDiff,
                                    percentDiff >= 0 ? styles.positive : styles.negative,
                                  ]}
                                >
                                  {percentDiff.toFixed(2)}%
                                </Text>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              ))}
            </>
          )
        )}

        {Object.keys(products).length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Additional Questions</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Does the account display price tags?</Text>
              <View style={styles.yesNoRow}>
                {['Yes', 'No'].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.yesNoBtn, displaysPriceTags === opt && styles.yesNoBtnSelected]}
                    onPress={() => setDisplaysPriceTags(opt)}
                  >
                    <Text style={[styles.yesNoBtnText, displaysPriceTags === opt && styles.yesNoBtnTextSelected]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Are we missing any shelf tags? If so, how many?</Text>
              <TextInput
                style={styles.textAreaInput}
                value={missingShelfTags}
                onChangeText={setMissingShelfTags}
                placeholder="e.g. Yes, missing 3 tags on Modelo shelf"
                placeholderTextColor="#555"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Comments</Text>
              <TextInput
                style={styles.textAreaInput}
                value={comments}
                onChangeText={setComments}
                placeholder="Any additional notes..."
                placeholderTextColor="#555"
                multiline
                numberOfLines={4}
              />
            </View>
          </>
        )}

        {Object.keys(products).length > 0 && (
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Survey</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );

  const renderSubmissions = () => {
    // Product name → category mapping (mirrors server.py PRODUCT_CATEGORY_MAP)
    const PRODUCT_CATEGORY_MAP: { [k: string]: string } = {
      'Keystone Light 24oz cans': '24oz cans Budget', 'Steel Reserve 24oz cans': '24oz cans Budget',
      'Steel Reserve Flavor 24oz cans': '24oz cans Budget', 'Lone Star 24oz cans': '24oz cans Budget',
      'Pabst 24oz cans': '24oz cans Budget', 'Natural Light 25oz cans': '24oz cans Budget',
      'Busch 25oz cans': '24oz cans Budget', 'Bud Ice 25oz cans': '24oz cans Budget',
      'Mil Best Ice 24oz cans': '24oz cans Budget', 'Busch Ice 25oz cans': '24oz cans Budget',
      'MHL 32oz can': '32oz & 40oz Budget', 'MHL 32oz bottle': '32oz & 40oz Budget',
      'Mil Best 32oz Crusher': '32oz & 40oz Budget', 'Mickeys 40oz': '32oz & 40oz Budget',
      'MHL 40oz': '32oz & 40oz Budget', 'Steel Reserve 40oz': '32oz & 40oz Budget',
      'Bud Ice 40oz': '32oz & 40oz Budget',
      'Miller Lite 24oz cans': '24oz cans Domestic', 'Coors Light 24oz cans': '24oz cans Domestic',
      'Coors Banquet 24oz cans': '24oz cans Domestic', 'Bud Light 25oz cans': '24oz cans Domestic',
      'Budweiser 25oz cans': '24oz cans Domestic',
      'Corona Familiar': '32oz High End', 'Michelob Ultra 24oz': '32oz High End',
      'Dos Equis 32oz bottles': '32oz High End', 'Corona Familiar 32oz bottles': '32oz High End',
      'Michelob Ultra 32oz bottles': '32oz High End',
      'Modelo Family': '24oz High End', 'Corona Family': '24oz High End',
      'Dos Equis Family': '24oz High End', 'Heineken': '24oz High End',
      'Michelob Ultra': '24oz High End', 'Bud Chelada': '24oz High End',
      'Modelo Family 24oz cans': '24oz High End', 'Corona Family 24oz cans': '24oz High End',
      'Dos Equis Family 24oz cans': '24oz High End', 'Heineken 24oz cans': '24oz High End',
      'Michelob Ultra 25oz can': '24oz High End', 'Bud Chelada 25oz can': '24oz High End',
      'Twisted Tea Family 24oz cans': '24oz High End and Flavor',
      "Mike's Family 23.5oz": '24oz High End and Flavor',
      'Smirnoff Family 23.5oz': '24oz High End and Flavor',
      '4 Loko 24oz cans': '24oz High End and Flavor', 'Cayman 24oz cans': '24oz High End and Flavor',
      'Club Tails 24oz cans': '24oz High End and Flavor', 'Monster 24oz cans': '24oz High End and Flavor',
      'Cantaritos': '24oz High End and Flavor',
      'New Belgium': '19.2oz High End and Flavor', 'New Belgium Revolver': '19.2oz High End and Flavor',
      'Revolver': '19.2oz High End and Flavor', 'Angry Orchard': '19.2oz High End and Flavor',
      'White Claw': '19.2oz High End and Flavor', 'Cayman Jacked': '19.2oz High End and Flavor',
      'Miller Lite 6pk bottles': 'Domestic 6pk 12oz', 'Coors Light 6pk bottles': 'Domestic 6pk 12oz',
      'Coors Banquet 6pk bottles': 'Domestic 6pk 12oz', 'Bud Light 6pk bottles': 'Domestic 6pk 12oz',
      'Budweiser 6pk bottles': 'Domestic 6pk 12oz',
      'Keystone Light 6pk 16oz cans': 'Budget 6pk 16oz cans', 'Lonestar 6pk 16oz cans': 'Budget 6pk 16oz cans',
      'Natural Light 6pk 16oz cans': 'Budget 6pk 16oz cans', 'Busch Light 6pk 16oz cans': 'Budget 6pk 16oz cans',
      'Steel Reserve 4pk 16oz cans': 'Budget 6pk 16oz cans', 'Bud Ice 4pk 16oz cans': 'Budget 6pk 16oz cans',
      'Miller Lite 6pk 16oz cans': 'Budget 6pk 16oz cans', 'Coors Light 6pk 16oz cans': 'Budget 6pk 16oz cans',
      'Coors Banquet 6pk 16oz cans': 'Budget 6pk 16oz cans', 'Bud Light 4pk 16oz cans': 'Budget 6pk 16oz cans',
      'Budweiser 4pk 16oz cans': 'Budget 6pk 16oz cans',
      'Modelo 6pk bottles': 'Import and High End 6pk', 'Corona Extra 6pk bottles': 'Import and High End 6pk',
      'Dos Equis 6pk bottles': 'Import and High End 6pk', 'Heineken 6pk bottles': 'Import and High End 6pk',
      'Michelob Ultra 6pk bottles': 'Import and High End 6pk', 'Modelo 6pk cans': 'Import and High End 6pk',
      'Michelob Ultra 6pk 16oz cans': 'Import and High End 6pk', 'Flight 6pk 16oz cans': 'Import and High End 6pk',
      'Smirnoff': '6pk bottle Flavor', 'Mikes': '6pk bottle Flavor',
      'Topo Chico': '6pk bottle Flavor', 'Cayman Jack': '6pk bottle Flavor',
      'Modelo Especial 12pk bottles': '12pk Import & High End', 'Modelo Chelada 12pk cans': '12pk Import & High End',
      'Michelob Ultra 12pk bottles': '12pk Import & High End', 'Michelob Ultra 12pk cans': '12pk Import & High End',
      'Modelo 12pk cans': '12pk Import & High End', 'Corona Premier 12pk cans': '12pk Import & High End',
      'Corona Premier 12pk bts': '12pk Import & High End', 'Dos Equis 12pk cans': '12pk Import & High End',
      'Heineken 12pk cans': '12pk Import & High End', 'Flight 12pk cans': '12pk Import & High End',
      'Miller Lite 12pk 12oz cans': 'Domestic 12pk 12oz and 9pk 16oz',
      'Coors Light 12pk 12oz cans': 'Domestic 12pk 12oz and 9pk 16oz',
      'Coors Banquet 12pk 12oz cans': 'Domestic 12pk 12oz and 9pk 16oz',
      'Yuengling Lager 12pk 12oz cans': 'Domestic 12pk 12oz and 9pk 16oz',
      'Miller Lite 9pk 16oz': 'Domestic 12pk 12oz and 9pk 16oz',
      'Coors Light 9pk 16oz': 'Domestic 12pk 12oz and 9pk 16oz',
      'Bud Light 12pk 12oz cans': 'Domestic 12pk 12oz and 9pk 16oz',
      'Budweiser 12pk 12oz cans': 'Domestic 12pk 12oz and 9pk 16oz',
      'Miller Lite 12pk 16oz cans': 'Domestic 12pk 16oz cans',
      'Coors Light 12pk 16oz cans': 'Domestic 12pk 16oz cans',
      'Coors Banquet 12pk 16oz cans': 'Domestic 12pk 16oz cans',
      'Bud Light 12pk 16oz cans': 'Domestic 12pk 16oz cans',
      'Budweiser 12pk 16oz cans': 'Domestic 12pk 16oz cans',
      'Miller Lite 18pk 12oz cans': '15pk and 18pk (Multiple categories)',
      'Coors Light 18pk 12oz cans': '15pk and 18pk (Multiple categories)',
      'Miller Lite 15pk 16oz alum pint': '15pk and 18pk (Multiple categories)',
      'Coors Light 15pk 16oz alum pint': '15pk and 18pk (Multiple categories)',
      'Bud Light 18pk 12oz cans': '15pk and 18pk (Multiple categories)',
      'Budweiser 18pk 12oz cans': '15pk and 18pk (Multiple categories)',
      'Modelo 18pk 12oz cans': '15pk and 18pk (Multiple categories)',
      'Michelob Ultra 18pk 12oz cans': '15pk and 18pk (Multiple categories)',
      'Keystone Light 15pk 12oz cans': '15pk and 18pk Budget',
      'Natural Light 15pk 12oz cans': '15pk and 18pk Budget',
      'Busch Light 18pk 12oz cans': '15pk and 18pk Budget',
      'Keystone Light': '30pk Budget', 'MHL': '30pk Budget',
      'Natural Light': '30pk Budget', 'Busch': '30pk Budget',
      'Miller Lite': '30pk Domestic', 'Coors Light': '30pk Domestic',
      'Coors Banquet': '30pk Domestic', 'Bud Light': '30pk Domestic', 'Budweiser': '30pk Domestic',
    };

    // Flatten: one row per product, with category resolved
    const rows: Array<{
      surveyId: string;
      date: string;
      customerId: string;
      customerName: string;
      territory: string;
      state: string;
      region: string;
      county: string;
      category: string;
      productName: string;
      unitCost: number | null;
      retailPrice: number | null;
      margin: number | null;
    }> = [];

    submissions.forEach((survey) => {
      survey.products.forEach((p) => {
        rows.push({
          surveyId:     survey.id,
          date:         survey.date_of_survey,
          customerId:   survey.customer_id || '',
          customerName: survey.customer_name || survey.account_name || '',
          territory:    survey.territory || '',
          state:        survey.state,
          region:       survey.region,
          county:       survey.county,
          category:     PRODUCT_CATEGORY_MAP[p.product_name] || 'Other',
          productName:  p.product_name,
          unitCost:     p.unit_cost ?? null,
          retailPrice:  p.retail_price ?? null,
          margin:       p.percent_difference ?? null,
        });
      });
    });

    const COL_WIDTHS = {
      date:         95,
      customerId:   75,
      customerName: 200,
      territory:    90,
      state:        65,
      region:       110,
      county:       85,
      category:     160,
      product:      210,
      unitCost:     80,
      retail:       75,
      margin:       80,
    };

    const totalWidth = Object.values(COL_WIDTHS).reduce((a, b) => a + b, 0);

    const headers = [
      { key: 'date',         label: 'Date',          width: COL_WIDTHS.date },
      { key: 'customerId',   label: 'Cust ID',       width: COL_WIDTHS.customerId },
      { key: 'customerName', label: 'Customer Name', width: COL_WIDTHS.customerName },
      { key: 'territory',    label: 'Territory',     width: COL_WIDTHS.territory },
      { key: 'state',        label: 'State',         width: COL_WIDTHS.state },
      { key: 'region',       label: 'Region',        width: COL_WIDTHS.region },
      { key: 'county',       label: 'County',        width: COL_WIDTHS.county },
      { key: 'category',     label: 'Category',      width: COL_WIDTHS.category },
      { key: 'product',      label: 'Product',       width: COL_WIDTHS.product },
      { key: 'unitCost',     label: 'Unit Cost',     width: COL_WIDTHS.unitCost },
      { key: 'retail',       label: 'Retail',        width: COL_WIDTHS.retail },
      { key: 'margin',       label: 'Margin %',      width: COL_WIDTHS.margin },
    ];

    return (
      <View style={styles.tableContainer}>
        <View style={styles.tableTopBar}>
          <Text style={styles.tableCount}>
            {rows.length} row{rows.length !== 1 ? 's' : ''} · {submissions.length} survey{submissions.length !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity style={styles.exportButton} onPress={handleExportCSV}>
            <Ionicons name="download-outline" size={16} color="#fff" />
            <Text style={styles.exportButtonText}>Export CSV</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#2196F3" style={styles.loader} />
        ) : submissions.length === 0 ? (
          <Text style={styles.noData}>No submissions yet</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View style={{ width: totalWidth }}>
              {/* Sticky header */}
              <View style={styles.tableHeaderRow}>
                {headers.map((h) => (
                  <View key={h.key} style={[styles.tableHeaderCell, { width: h.width }]}>
                    <Text style={styles.tableHeaderText} numberOfLines={1}>{h.label}</Text>
                  </View>
                ))}
              </View>
              {/* Data rows */}
              <ScrollView showsVerticalScrollIndicator nestedScrollEnabled>
                {rows.map((row, idx) => {
                  const isEven = idx % 2 === 0;
                  const marginColor = row.margin === null ? '#888'
                    : row.margin >= 0 ? '#4CAF50' : '#F44336';

                  return (
                    <View
                      key={`${row.surveyId}-${idx}`}
                      style={[styles.tableDataRow, isEven ? styles.tableRowEven : styles.tableRowOdd]}
                    >
                      <View style={[styles.tableCell, { width: COL_WIDTHS.date }]}>
                        <Text style={styles.tableCellText} numberOfLines={1}>{row.date}</Text>
                      </View>
                      <View style={[styles.tableCell, { width: COL_WIDTHS.customerId }]}>
                        <Text style={[styles.tableCellText, styles.tableCellMono]} numberOfLines={1}>{row.customerId}</Text>
                      </View>
                      <View style={[styles.tableCell, { width: COL_WIDTHS.customerName }]}>
                        <Text style={[styles.tableCellText, styles.tableCellBold]} numberOfLines={2}>{row.customerName}</Text>
                      </View>
                      <View style={[styles.tableCell, { width: COL_WIDTHS.territory }]}>
                        <Text style={styles.tableCellText} numberOfLines={1}>{row.territory}</Text>
                      </View>
                      <View style={[styles.tableCell, { width: COL_WIDTHS.state }]}>
                        <Text style={styles.tableCellText} numberOfLines={1}>{row.state}</Text>
                      </View>
                      <View style={[styles.tableCell, { width: COL_WIDTHS.region }]}>
                        <Text style={styles.tableCellText} numberOfLines={1}>{row.region}</Text>
                      </View>
                      <View style={[styles.tableCell, { width: COL_WIDTHS.county }]}>
                        <Text style={styles.tableCellText} numberOfLines={1}>{row.county}</Text>
                      </View>
                      {/* Category — accent colour */}
                      <View style={[styles.tableCell, { width: COL_WIDTHS.category }]}>
                        <Text style={[styles.tableCellText, styles.categoryBadge]} numberOfLines={2}>{row.category}</Text>
                      </View>
                      <View style={[styles.tableCell, { width: COL_WIDTHS.product }]}>
                        <Text style={styles.tableCellText} numberOfLines={2}>{row.productName}</Text>
                      </View>
                      <View style={[styles.tableCell, { width: COL_WIDTHS.unitCost }]}>
                        <Text style={[styles.tableCellText, styles.tableCellRight]}>
                          {row.unitCost !== null ? `$${row.unitCost.toFixed(2)}` : ''}
                        </Text>
                      </View>
                      <View style={[styles.tableCell, { width: COL_WIDTHS.retail }]}>
                        <Text style={[styles.tableCellText, styles.tableCellRight]}>
                          {row.retailPrice !== null ? `$${row.retailPrice.toFixed(2)}` : ''}
                        </Text>
                      </View>
                      <View style={[styles.tableCell, { width: COL_WIDTHS.margin }]}>
                        <Text style={[styles.tableCellText, styles.tableCellRight, { color: marginColor }]}>
                          {row.margin !== null ? `${row.margin.toFixed(2)}%` : ''}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </ScrollView>
        )}
      </View>
    );
  };


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Price Survey Tool</Text>
        <Text style={styles.headerSubtitle}>Independent C-Store Survey</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'survey' && styles.activeTab]}
          onPress={() => setActiveTab('survey')}
        >
          <Ionicons
            name="create-outline"
            size={18}
            color={activeTab === 'survey' ? '#fff' : '#888'}
          />
          <Text style={[styles.tabText, activeTab === 'survey' && styles.activeTabText]}>
            Survey
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'submissions' && styles.activeTab]}
          onPress={() => setActiveTab('submissions')}
        >
          <Ionicons
            name="list-outline"
            size={18}
            color={activeTab === 'submissions' ? '#fff' : '#888'}
          />
          <Text style={[styles.tabText, activeTab === 'submissions' && styles.activeTabText]}>
            Data
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'qrcode' && styles.activeTab]}
          onPress={() => setActiveTab('qrcode')}
        >
          <Ionicons
            name="qr-code-outline"
            size={18}
            color={activeTab === 'qrcode' ? '#fff' : '#888'}
          />
          <Text style={[styles.tabText, activeTab === 'qrcode' && styles.activeTabText]}>
            QR Code
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'survey' && renderSurveyForm()}
      {activeTab === 'submissions' && (
        <View style={{ flex: 1 }}>
          {renderSubmissions()}
        </View>
      )}
      {activeTab === 'qrcode' && renderQRCode()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 12,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 10,
    paddingBottom: 10,
    justifyContent: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#252525',
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#2196F3',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
  },
  activeTabText: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  centeredContent: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  formContainer: {
    padding: 20,
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
  },
  submissionsContainer: {
    padding: 20,
    width: '100%',
    maxWidth: 500,
  },
  tableContainer: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  tableTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  tableCount: {
    fontSize: 13,
    color: '#888',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#1e2a3a',
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3',
  },
  tableHeaderCell: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#2a3a4a',
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7ab8f5',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tableBody: {
    maxHeight: '100%',
  },
  tableDataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  tableRowEven: {
    backgroundColor: '#111',
  },
  tableRowOdd: {
    backgroundColor: '#161616',
  },
  tableCell: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#1e1e1e',
  },
  tableCellText: {
    fontSize: 12,
    color: '#ccc',
  },
  tableCellBold: {
    fontWeight: '600',
    color: '#fff',
  },
  tableCellMono: {
    color: '#7ab8f5',
  },
  tableCellRight: {
    textAlign: 'right',
  },
  catHeaderCell: {
    backgroundColor: '#1a2535',
    borderLeftWidth: 1,
    borderLeftColor: '#2196F3',
  },
  catHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7ab8f5',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    lineHeight: 13,
  },
  catCell: {
    borderLeftWidth: 1,
    borderLeftColor: '#1e2a3a',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  catRetail: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  catProductCount: {
    fontSize: 9,
    color: '#555',
    marginTop: 1,
  },
  catEmpty: {
    fontSize: 12,
    color: '#2a2a2a',
    textAlign: 'right',
  },
  categoryBadge: {
    color: '#7ab8f5',
    fontSize: 11,
    fontWeight: '600',
  },
  yesNoRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginTop: 4,
  },
  yesNoBtn: {
    paddingHorizontal: 32,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#1e1e1e',
  },
  yesNoBtnSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  yesNoBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  yesNoBtnTextSelected: {
    color: '#fff',
  },
  textAreaInput: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
    width: '100%',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    marginTop: 8,
    textAlign: 'center',
    width: '100%',
  },
  inputContainer: {
    marginBottom: 14,
    width: '100%',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#aaa',
    marginBottom: 4,
    textAlign: 'center',
  },
  sublabel: {
    fontSize: 11,
    color: '#555',
    marginBottom: 8,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
    width: 280,
    textAlign: 'center',
  },

  // Customer search
  searchWrapper: {
    width: '100%',
    position: 'relative',
    zIndex: 100,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    paddingVertical: 2,
  },
  clearBtn: {
    padding: 2,
    marginLeft: 6,
  },
  resultsDropdown: {
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 260,
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  resultMain: {
    flex: 1,
    paddingRight: 8,
  },
  resultName: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  resultSub: {
    fontSize: 11,
    color: '#777',
    marginTop: 1,
  },
  resultAR: {
    fontSize: 11,
    color: '#555',
    maxWidth: 120,
    textAlign: 'right',
  },
  noResults: {
    padding: 14,
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
  },

  // Selected customer card
  selectedCard: {
    backgroundColor: '#1a2a1a',
    borderWidth: 1,
    borderColor: '#2a4a2a',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    width: '100%',
  },
  selectedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  selectedCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4CAF50',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedCardGrid: {
    gap: 4,
  },
  selectedCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 2,
  },
  selectedCardLabel: {
    fontSize: 12,
    color: '#666',
    minWidth: 90,
  },
  selectedCardValue: {
    fontSize: 12,
    color: '#ccc',
    flex: 1,
    textAlign: 'right',
  },

  dropdownContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  dropdownOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  dropdownOptionSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  dropdownOptionText: {
    fontSize: 13,
    color: '#ccc',
  },
  dropdownOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  instructions: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  categoryContainer: {
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    width: '100%',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#252525',
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  productList: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  productInfo: {
    flex: 1,
    paddingRight: 8,
  },
  productName: {
    fontSize: 13,
    color: '#ddd',
    marginBottom: 2,
  },
  unitCost: {
    fontSize: 11,
    color: '#777',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceInput: {
    width: 60,
    backgroundColor: '#1e1e1e',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#444',
    textAlign: 'center',
  },
  percentDiff: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 45,
    textAlign: 'right',
  },
  positive: {
    color: '#4CAF50',
  },
  negative: {
    color: '#F44336',
  },
  loader: {
    marginVertical: 20,
  },
  submitButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
  submissionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  noData: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginTop: 30,
  },
  qrContainer: {
    padding: 30,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  qrTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  qrSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 30,
    textAlign: 'center',
  },
  qrBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  qrUrl: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
